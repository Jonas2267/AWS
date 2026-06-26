import Foundation
import AWSHackCore

let hub = PersonalDataHub()
let briefing = await hub.dailyBriefing(for: "Jonas")
print(DailyBriefingBuilder.response(username: "Jonas", briefing: briefing))
let parser = CommandParser()
let executor = CommandExecutor(hub: hub, permissions: DemoPermissionManager())
let calendarCommand = parser.parse("Erstelle morgen um 8 Uhr einen Termin Schule")
print(await executor.execute(calendarCommand, username: "Jonas"))
let fuelCommand = parser.parse("Finde die billigste Tankstelle in der Nähe")
print(await executor.execute(fuelCommand, username: "Jonas"))
