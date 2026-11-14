import AdminRoulette from '../admin/Roulette'
import { useAdminSession, useRun } from '../admin/useAdmin'
import Roulette from './Roulette'

// The Ruleta page: admins get the spinner, coins and outcome editor; everyone else sees the wheel,
// the odds, who has coins and the spin history.
export default function RoulettePage({ data, reload, onPlayer }) {
  const { user, admin } = useAdminSession()
  const [run, toast] = useRun(reload)

  if (admin) {
    return (
      <>
        <AdminRoulette data={data} run={run} />
        {toast}
      </>
    )
  }
  return (
    <>
      <Roulette data={data} onPlayer={onPlayer} />
      {user === null && (
        <p className="hint center">Admini: za vrtenje se <a href="#/admin">prijavi v Admin</a>.</p>
      )}
    </>
  )
}
