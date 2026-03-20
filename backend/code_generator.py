"""
Code Generation Service - Uses Inworld AI Router (OpenAI-compatible) to generate web application code
"""
import os
import json
import traceback
import httpx
from dotenv import load_dotenv

load_dotenv()

INWORLD_API_URL = "https://api.inworld.ai/v1/chat/completions"

SYSTEM_PROMPT = """You are ForJenta, an expert AI web application builder. You generate complete, working web applications.

When given a prompt describing a web application, you MUST respond with ONLY a valid JSON object (no markdown, no code fences, no extra text) in this exact format:

{
  "success": true,
  "files": [
    {
      "path": "index.html",
      "content": "<!DOCTYPE html>...",
      "language": "html"
    },
    {
      "path": "styles.css", 
      "content": "body { ... }",
      "language": "css"
    },
    {
      "path": "script.js",
      "content": "// JavaScript code...",
      "language": "javascript"
    }
  ],
  "summary": "Brief description of what was built"
}

Rules:
1. Always generate a complete, working web application with all necessary files
2. Use modern HTML5, CSS3, and vanilla JavaScript (no frameworks unless specifically asked)
3. Make the UI beautiful with good styling, colors, and layout
4. Include responsive design
5. All code must be production-ready and error-free
6. Always include index.html as the main entry point
7. Use inline CSS in a <style> tag within HTML OR create a separate styles.css file
8. For complex apps, create separate JS files
9. RESPOND WITH ONLY THE JSON OBJECT - no markdown formatting, no ```json blocks, just raw JSON
10. If this is a continuation/modification of an existing project, only include files that need to be created or modified
"""

CONTINUATION_PROMPT = """You are ForJenta, an expert AI web application builder. You modify and improve existing web applications.

You are given the current project files and a request to modify them. You MUST respond with ONLY a valid JSON object (no markdown, no code fences) containing ONLY the files that need to be created or modified:

{
  "success": true,
  "files": [
    {
      "path": "filename.ext",
      "content": "complete file content...",
      "language": "html|css|javascript|etc"
    }
  ],
  "summary": "Brief description of changes made"
}

Rules:
1. Only include files that are NEW or MODIFIED - don't repeat unchanged files
2. When modifying a file, include the COMPLETE new content (not just the diff)
3. Maintain consistency with the existing codebase style
4. Ensure all changes are compatible with the existing code
5. RESPOND WITH ONLY THE JSON OBJECT - no markdown formatting
"""


async def generate_code(prompt: str, categories: list[str], context: str = "", mode: str = "full") -> dict:
    """Generate code using Inworld AI Router (OpenAI-compatible endpoint)"""
    api_key = os.environ.get("INWORLD_API_KEY")
    router_name = os.environ.get("INWORLD_ROUTER", "default-forjenta-model")
    backup_router = os.environ.get("INWORLD_BACKUP_ROUTER", "backup-router")

    if not api_key:
        return {"success": False, "error": "Inworld AI API key not configured", "files": []}

    is_continuation = bool(context and context.strip())
    system_msg = CONTINUATION_PROMPT if is_continuation else SYSTEM_PROMPT

    # Build user message
    if is_continuation:
        user_text = f"""Here is the current project context:

{context}

User's request:
{prompt}

Categories: {', '.join(categories)}

Generate the modified/new files as JSON. Remember: ONLY include files that need changes."""
    else:
        user_text = f"""Build this web application:

{prompt}

Categories: {', '.join(categories)}

Generate all necessary files as a complete working application. Respond with JSON only."""

    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_text},
    ]

    # Try primary router, then backup
    for model_name in [f"inworld/{router_name}", f"inworld/{backup_router}"]:
        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                response = await client.post(
                    INWORLD_API_URL,
                    headers={
                        "Authorization": f"Basic {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model_name,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 32000,
                    },
                )

                if response.status_code != 200:
                    print(f"[Inworld] {model_name} returned {response.status_code}: {response.text[:300]}")
                    continue

                data = response.json()
                content = data["choices"][0]["message"]["content"]

                return _parse_generation_response(content)

        except Exception as e:
            print(f"[Inworld] Error with {model_name}: {e}")
            traceback.print_exc()
            continue

    return {"success": False, "error": "All Inworld AI routers failed", "files": []}


def _parse_generation_response(response_text: str) -> dict:
    """Parse the JSON response from the LLM. Handles truncated responses."""
    text = response_text.strip()

    # Handle markdown code fences if LLM wraps response
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)

    # Try direct parse first
    try:
        result = json.loads(text)
    except json.JSONDecodeError:
        # Attempt to repair truncated JSON
        result = _repair_truncated_json(text)
        if result is None:
            return {"success": False, "error": "AI response was truncated. Try a simpler or more specific prompt.", "files": []}

    if not isinstance(result.get("files"), list):
        return {"success": False, "error": "Invalid response format from AI", "files": []}

    clean_files = []
    for f in result["files"]:
        if "path" in f and "content" in f:
            clean_files.append({
                "path": f["path"],
                "content": f["content"],
                "language": f.get("language", guess_language(f["path"])),
            })

    if not clean_files:
        return {"success": False, "error": "AI generated no valid files. Try rephrasing your prompt.", "files": []}

    return {
        "success": True,
        "files": clean_files,
        "summary": result.get("summary", f"Generated {len(clean_files)} files"),
    }


def _repair_truncated_json(text: str) -> dict | None:
    """Attempt to repair truncated JSON by closing open structures."""
    # Find the files array in the text
    if '"files"' not in text:
        return None

    # Strategy: find complete file objects before the truncation
    import re
    file_objects = []
    pattern = r'\{\s*"path"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"language"\s*:\s*"([^"]+)"\s*\}'
    for match in re.finditer(pattern, text, re.DOTALL):
        file_objects.append({
            "path": match.group(1),
            "content": match.group(2).replace('\\"', '"').replace('\\n', '\n').replace('\\t', '\t'),
            "language": match.group(3),
        })

    if file_objects:
        return {"success": True, "files": file_objects, "summary": f"Generated {len(file_objects)} files (response was truncated, recovered {len(file_objects)} complete files)"}

    return None


def guess_language(path: str) -> str:
    """Guess file language from extension"""
    ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
    return {
        "html": "html",
        "htm": "html",
        "css": "css",
        "js": "javascript",
        "ts": "typescript",
        "jsx": "javascript",
        "tsx": "typescript",
        "json": "json",
        "md": "markdown",
        "py": "python",
        "svg": "xml",
    }.get(ext, "text")
