import { useState } from 'react';
import { ChevronRight, ChevronDown, FolderOpen, Folder, FileCode, FileJson, FileText, MoreHorizontal, FileType } from 'lucide-react';
import type { FileNode } from '@/stores/workspaceStore';

interface Props {
  files: FileNode[];
  activeFile: string | null;
  onFileSelect: (path: string) => void;
}

function getFileIcon(name: string) {
  if (name.endsWith('.html') || name.endsWith('.htm')) return <FileCode size={15} className="text-[#e09932]" />;
  if (name.endsWith('.json')) return <FileJson size={15} className="text-[#6db3f2]" />;
  if (name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.jsx') || name.endsWith('.tsx')) return <FileCode size={15} className="text-[#e5c07b]" />;
  if (name.endsWith('.css')) return <FileCode size={15} className="text-[#6db3f2]" />;
  if (name === '.gitignore') return <FileType size={15} className="text-[#d04747]" />;
  if (name.endsWith('.md')) return <FileText size={15} className="text-[#6db3f2]" />;
  if (name.endsWith('.svg')) return <FileCode size={15} className="text-[#e09932]" />;
  return <FileText size={15} className="text-[#8b93a1]" />;
}

function TreeNode({ node, depth, activeFile, onFileSelect }: {
  node: FileNode; depth: number; activeFile: string | null; onFileSelect: (p: string) => void;
}) {
  const [open, setOpen] = useState(node.name === 'src' || depth === 0);
  const isActive = activeFile === node.path;

  if (node.type === 'folder') {
    return (
      <div>
        <button
          className={`ide-tree-row ${isActive ? 'ide-tree-active' : ''}`}
          style={{ paddingLeft: 12 + depth * 12 }}
          onClick={() => setOpen(o => !o)}
          data-testid={`folder-${node.name}`}
        >
          {open ? <ChevronDown size={14} className="shrink-0 text-[#8b93a1]" /> : <ChevronRight size={14} className="shrink-0 text-[#8b93a1]" />}
          {open ? <FolderOpen size={15} className="shrink-0 text-[#8b93a1] ml-[2px]" /> : <Folder size={15} className="shrink-0 text-[#8b93a1] ml-[2px]" />}
          <span className="ide-tree-label">{node.name}</span>
        </button>
        {open && node.children?.map(child => (
          <TreeNode key={child.path} node={child} depth={depth + 1} activeFile={activeFile} onFileSelect={onFileSelect} />
        ))}
      </div>
    );
  }

  return (
    <button
      className={`ide-tree-row ${isActive ? 'ide-tree-active' : ''}`}
      style={{ paddingLeft: 12 + depth * 12 + 18 }}
      onClick={() => onFileSelect(node.path)}
      data-testid={`file-${node.name}`}
    >
      {getFileIcon(node.name)}
      <span className="ide-tree-label">{node.name}</span>
    </button>
  );
}

export default function ExplorerPanel({ files, activeFile, onFileSelect }: Props) {
  return (
    <div className="ide-explorer" data-testid="explorer-panel">
      <div className="ide-explorer-header">
        <span>EXPLORER</span>
        <button className="ide-header-icon"><MoreHorizontal size={14} /></button>
      </div>
      <div className="ide-explorer-tree">
        {files.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-[#8b93a1] text-xs">No files yet.</p>
            <p className="text-[#555] text-xs mt-1">Use the AI panel to generate code.</p>
          </div>
        ) : (
          <>
            <div className="ide-explorer-root">
              <ChevronDown size={14} className="text-[#8b93a1]" />
              <span className="ide-explorer-root-label">PROJECT</span>
            </div>
            {files.map(f => (
              <TreeNode key={f.path} node={f} depth={0} activeFile={activeFile} onFileSelect={onFileSelect} />
            ))}
          </>
        )}
      </div>
      <div className="ide-explorer-sections">
        <div className="ide-explorer-section">
          <ChevronRight size={14} className="text-[#8b93a1]" />
          <span>OUTLINE</span>
        </div>
        <div className="ide-explorer-section">
          <ChevronRight size={14} className="text-[#8b93a1]" />
          <span>TIMELINE</span>
        </div>
      </div>
    </div>
  );
}
