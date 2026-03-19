"""
Code Generation Service - Uses LLM to generate web application code
"""
import os
import json
import uuid
import traceback
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

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
    """Generate code using LLM"""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return {"success": False, "error": "LLM API key not configured", "files": []}

    session_id = f"gen-{uuid.uuid4().hex[:12]}"
    
    is_continuation = bool(context and context.strip())
    system_msg = CONTINUATION_PROMPT if is_continuation else SYSTEM_PROMPT
    
    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=system_msg,
    )
    chat.with_model("openai", "gpt-4o")

    # Build the user message
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

    try:
        user_message = UserMessage(text=user_text)
        response = await chat.send_message(user_message)
        
        # Parse the JSON response
        response_text = response.strip()
        
        # Handle markdown code fences if LLM wraps response
        if response_text.startswith("```"):
            # Remove ```json and ``` wrappers
            lines = response_text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].strip() == "```":
                lines = lines[:-1]
            response_text = "\n".join(lines)
        
        result = json.loads(response_text)
        
        if not isinstance(result.get("files"), list):
            return {"success": False, "error": "Invalid response format from AI", "files": []}
        
        # Ensure each file has required fields
        clean_files = []
        for f in result["files"]:
            if "path" in f and "content" in f:
                clean_files.append({
                    "path": f["path"],
                    "content": f["content"],
                    "language": f.get("language", guess_language(f["path"])),
                })
        
        return {
            "success": True,
            "files": clean_files,
            "summary": result.get("summary", f"Generated {len(clean_files)} files"),
        }
        
    except json.JSONDecodeError as e:
        return {"success": False, "error": f"Failed to parse AI response: {str(e)}", "files": []}
    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": str(e), "files": []}


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
