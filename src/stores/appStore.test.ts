import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from './appStore'

describe('appStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      activeMainTab: 'content',
      mainLayout: 'tab',
      projectRoot: null,
      fileTree: [],
      selectedFile: null,
      expandedDirs: new Set(),
    })
  })

  it('初期値は content', () => {
    expect(useAppStore.getState().activeMainTab).toBe('content')
  })

  it('setActiveMainTab で terminal に切り替わる', () => {
    useAppStore.getState().setActiveMainTab('terminal')
    expect(useAppStore.getState().activeMainTab).toBe('terminal')
  })

  it('setActiveMainTab で content に戻せる', () => {
    useAppStore.getState().setActiveMainTab('terminal')
    useAppStore.getState().setActiveMainTab('content')
    expect(useAppStore.getState().activeMainTab).toBe('content')
  })

  it('toggleExpandedDir でディレクトリが展開される', () => {
    useAppStore.getState().toggleExpandedDir('/project/src')
    expect(useAppStore.getState().expandedDirs.has('/project/src')).toBe(true)
  })

  it('toggleExpandedDir を2回呼ぶと折りたたまれる', () => {
    useAppStore.getState().toggleExpandedDir('/project/src')
    useAppStore.getState().toggleExpandedDir('/project/src')
    expect(useAppStore.getState().expandedDirs.has('/project/src')).toBe(false)
  })
})

describe('appStore persist', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      activeMainTab: 'content',
      mainLayout: 'tab',
      projectRoot: null,
      fileTree: [],
      selectedFile: null,
      expandedDirs: new Set(),
    })
  })

  it('projectRoot を設定すると localStorage に保存される', () => {
    useAppStore.getState().setProjectRoot('/my/project')
    const saved = JSON.parse(localStorage.getItem('spec-prompt-app-store') ?? '{}')
    expect(saved.state.projectRoot).toBe('/my/project')
  })

  it('expandedDirs の Set がシリアライズされて保存される', () => {
    useAppStore.getState().toggleExpandedDir('/my/project/src')
    const saved = JSON.parse(localStorage.getItem('spec-prompt-app-store') ?? '{}')
    expect(saved.state.expandedDirs).toEqual({ __type: 'Set', values: ['/my/project/src'] })
  })

  it('fileTree は localStorage に保存されない', () => {
    useAppStore.getState().setFileTree([{ name: 'test', path: '/test', is_dir: false }])
    const saved = JSON.parse(localStorage.getItem('spec-prompt-app-store') ?? '{}')
    expect(saved.state?.fileTree).toBeUndefined()
  })
})
