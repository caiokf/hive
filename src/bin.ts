import { program } from "commander"
import { registerInitCommand } from "./commands/init.js"
import { registerDoctorCommand } from "./commands/doctor.js"
import { registerStartCommand } from "./commands/start.js"
import { registerStopCommand } from "./commands/stop.js"
import { registerStatusCommand } from "./commands/status.js"
import { registerDashCommand } from "./commands/dash.js"
import { registerAddCommand } from "./commands/add.js"
import { registerListCommand } from "./commands/list.js"
import { registerRunCommand } from "./commands/run.js"
import { registerLogsCommand } from "./commands/logs.js"
import { registerConnectCommand } from "./commands/connect.js"
import { VERSION } from "./version.js"

program
  .name("hive")
  .description("Autonomous AI coding agents triggered by GitHub events and schedules")
  .version(VERSION)

registerInitCommand(program)
registerStartCommand(program)
registerStopCommand(program)
registerStatusCommand(program)
registerDashCommand(program)
registerAddCommand(program)
registerListCommand(program)
registerRunCommand(program)
registerLogsCommand(program)
registerDoctorCommand(program)
registerConnectCommand(program)

program.parse()
