import { CronJob } from "cron"
import type { TaskDefinition } from "./types.js"

export interface SchedulerOpts {
  tasks: TaskDefinition[]
  onTrigger: (task: TaskDefinition) => void
  onLog?: (msg: string) => void
}

export function createScheduler(opts: SchedulerOpts) {
  const { tasks, onTrigger, onLog } = opts
  const jobs: CronJob[] = []

  const cronTasks = tasks.filter(t => t.trigger.type === "cron")

  for (const task of cronTasks) {
    if (task.trigger.type !== "cron") continue

    const job = CronJob.from({
      cronTime: task.trigger.schedule,
      onTick: () => {
        onLog?.(`Cron triggered: ${task.name} (${task.trigger.type === "cron" ? task.trigger.schedule : ""})`)
        onTrigger(task)
      },
      start: false,
      timeZone: "America/New_York",
    })

    jobs.push(job)
    onLog?.(`Scheduled cron: ${task.name} → ${task.trigger.type === "cron" ? task.trigger.schedule : ""}`)
  }

  return {
    start() {
      for (const job of jobs) job.start()
      onLog?.(`Started ${jobs.length} cron job(s)`)
    },
    stop() {
      for (const job of jobs) job.stop()
    },
    get jobCount() {
      return jobs.length
    },
  }
}
