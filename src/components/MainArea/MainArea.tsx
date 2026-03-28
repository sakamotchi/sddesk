import { FileText, Terminal, X } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { SplitPane } from '../SplitPane'
import { TerminalTabs } from '../TerminalPanel'
import { MainTabs } from './MainTabs'

function SplitPaneHeader({
  label,
  icon,
  onClose,
}: {
  label: string
  icon: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="flex items-center justify-between h-9 px-3 flex-shrink-0"
      style={{
        background: 'var(--color-bg-elevated)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <span
        className="flex items-center gap-1.5 text-sm"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {icon}
        {label}
      </span>
      <button
        onClick={onClose}
        className="flex items-center justify-center w-6 h-6 rounded transition-colors hover:bg-white/10 outline-none"
        style={{ color: 'var(--color-text-muted)' }}
        title="Split を解除"
      >
        <X size={13} />
      </button>
    </div>
  )
}

export function MainArea() {
  const mainLayout = useAppStore((s) => s.mainLayout)
  const toggleMainLayout = useAppStore((s) => s.toggleMainLayout)

  const contentNode = (
    <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
      コンテンツビューア（Phase 2-A で実装）
    </div>
  )
  const terminalNode = <TerminalTabs />

  if (mainLayout === 'split') {
    return (
      <div className="flex flex-col h-full bg-[var(--color-bg-base)]">
        <SplitPane direction="horizontal" defaultSize={500} minSize={200} maxSize={1200}>
          <div className="flex flex-col h-full">
            <SplitPaneHeader
              label="コンテンツ"
              icon={<FileText size={14} />}
              onClose={toggleMainLayout}
            />
            <div className="flex-1 min-h-0 overflow-hidden">{contentNode}</div>
          </div>
          <div className="flex flex-col h-full">
            <SplitPaneHeader
              label="ターミナル"
              icon={<Terminal size={14} />}
              onClose={toggleMainLayout}
            />
            <div className="flex-1 min-h-0 overflow-hidden">{terminalNode}</div>
          </div>
        </SplitPane>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-base)]">
      <MainTabs children={{ content: contentNode, terminal: terminalNode }} />
    </div>
  )
}
