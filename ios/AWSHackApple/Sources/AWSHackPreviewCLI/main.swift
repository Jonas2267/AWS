import Foundation
import AWSHackCore

let hub = PersonalDataHub()
let briefing = await hub.dailyBriefing(for: "Jonas")
print(DailyBriefingBuilder.response(username: "Jonas", briefing: briefing))
let parser = CommandParser()
let command = parser.parse("Erstelle morgen um 8 Uhr einen Termin Schule")
let response = await CommandExecutor(hub: hub, permissions: DemoPermissionManager()).execute(command, username: "Jonas")
print(response)
