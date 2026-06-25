export interface AIProvider {
  complete(prompt: string): Promise<string>;
}

export class LocalDemoProvider implements AIProvider {
  async complete(prompt: string): Promise<string> {
    return `AURA Core Demo: Ich habe „${prompt}“ verstanden und nutze lokale Regeln statt Cloud-KI.`;
  }
}

export class OpenAIProvider implements AIProvider {
  async complete(): Promise<string> {
    throw new Error('OpenAIProvider ist vorbereitet. API-Schlüssel gehören serverseitig in eine sichere Route, nicht in den Browser.');
  }
}
