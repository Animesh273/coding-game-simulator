import { useEffect, useState } from 'react'
import { useGame } from './state/store'
import { startSync } from './state/sync'
import { TopBar, Nav, EventLayer, type Tab } from './components/Shell'
import { Onboarding } from './screens/Onboarding'
import { WorldMap } from './screens/WorldMap'
import { WorldDetail } from './screens/WorldDetail'
import { Battle } from './screens/Battle'
import { Learn } from './screens/Learn'
import { Quests } from './screens/Quests'
import { Arena } from './screens/Arena'
import { Mentor } from './screens/Mentor'
import { Profile } from './screens/Profile'
import type { WorldId } from './game/types'

export default function App() {
  const onboarded = useGame((s) => s.onboarded)
  const run = useGame((s) => s.run)
  const tickDay = useGame((s) => s.tickDay)
  const openChest = useGame((s) => s.openChest)

  const [tab, setTab] = useState<Tab>('map')
  const [world, setWorld] = useState<WorldId | null>(null)
  const [learning, setLearning] = useState<string | null>(null)

  /* Roll the calendar forward on mount and whenever the tab regains focus —
     a student who leaves the app open overnight should still see today's
     quests and an intact (or correctly broken) streak. */
  // Connects the local save to the account, if one is configured. Safe to call
  // unconditionally — with no Supabase project it reports 'off' and no-ops.
  useEffect(() => {
    startSync()
  }, [])

  useEffect(() => {
    tickDay()
    const onFocus = () => tickDay()
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [tickDay])

  if (!onboarded) {
    return (
      <div className="app">
        <Onboarding />
      </div>
    )
  }

  return (
    <div className="app">
      <TopBar onOpenChests={openChest} />

      {run ? (
        <Battle
          onExit={() => {
            useGame.setState({ run: null })
            setWorld(null)
            setLearning(null)
          }}
        />
      ) : learning ? (
        // A lesson takes over the whole screen wherever it was opened from,
        // so it can be reached from the skill tree and the topics tracker alike.
        <Learn skillId={learning} onExit={() => setLearning(null)} />
      ) : tab === 'map' ? (
        world ? (
          <WorldDetail world={world} onBack={() => setWorld(null)} onLearn={setLearning} />
        ) : (
          <WorldMap onEnterWorld={setWorld} />
        )
      ) : tab === 'quests' ? (
        <Quests />
      ) : tab === 'arena' ? (
        <Arena />
      ) : tab === 'mentor' ? (
        <Mentor />
      ) : (
        <Profile onLearn={setLearning} />
      )}

      <Nav
        tab={tab}
        onTab={(t) => {
          setTab(t)
          setWorld(null)
          setLearning(null)
        }}
      />

      <EventLayer />
    </div>
  )
}
