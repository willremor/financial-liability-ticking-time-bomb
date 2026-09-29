import { Dashboard } from "@/components/dashboard"
import { buildSchedule } from "@/lib/projection"

export default function Page() {
  return <Dashboard schedule={buildSchedule()} />
}
