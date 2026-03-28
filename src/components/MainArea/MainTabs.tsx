import { useEffect } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { FileText, Terminal, Columns2 } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'

interface MainTabsProps {
  children: {
    content: React.ReactNode
    terminal: React.ReactNode
  }
}

export function MainTabs({ children }: MainTabsProps) {
  const activeMainTab = useAppStore((s) => s.activeMainTab)
  const setActiveMainTab = useAppStore((s) => s.setActiveMainTab)
  const mainLayout = useAppStore((s) => s.mainLayout)
  const toggleMainLayout = useAppStore((s) => s.toggleMainLayout)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Tab' && mainLayout === 'tab') {
        e.preventDefault()
        setActiveMainTab(activeMainTab === 'content' ? 'terminal' : 'content')
      }
      if (e.ctrlKey && e.key === '\\') {
        e.preventDefault()
        toggleMainLayout()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [activeMainTab, mainLayout, setActiveMainTab, toggleMainLayout])

  return (
    <Tabs.Root
      value={activeMainTab}
      onValueChange={(v) => setActiveMainTab(v as 'content' | 'terminal')}
      className="flex flex-col h-full"
    >
      {/* タブバー */}
      <Tabs.List className="flex items-center h-9 flex-shrink-0 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)]">
        <Tabs.Trigger
          value="content"
          className={[
            'flex items-center gap-1.5 h-full px-4 text-sm transition-colors',
            'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
            'data-[state=active]:text-[var(--color-text-primary)]',
            'data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)]',
            'outline-none',
          ].join(' ')}
        >
          <FileText size={14} />
          コンテンツ
        </Tabs.Trigger>
        <Tabs.Trigger
          value="terminal"
          className={[
            'flex items-center gap-1.5 h-full px-4 text-sm transition-colors',
            'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
            'data-[state=active]:text-[var(--color-text-primary)]',
            'data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)]',
            'outline-none',
          ].join(' ')}
        >
          <Terminal size={14} />
          ターミナル
        </Tabs.Trigger>

        {/* Split ボタン */}
        <div className="ml-auto flex items-center pr-2">
          <button
            onClick={toggleMainLayout}
            title="Split View (Ctrl+\)"
            className="flex items-center justify-center w-7 h-7 rounded transition-colors outline-none hover:bg-white/10"
            style={{
              color: mainLayout === 'split' ? 'var(--color-accent)' : 'var(--color-text-muted)',
            }}
          >
            <Columns2 size={14} />
          </button>
        </div>
      </Tabs.List>

      {/* コンテンツエリア */}
      <Tabs.Content value="content" className="flex-1 overflow-hidden min-h-0">
        {children.content}
      </Tabs.Content>
      <Tabs.Content value="terminal" className="flex-1 overflow-hidden min-h-0">
        {children.terminal}
      </Tabs.Content>
    </Tabs.Root>
  )
}
