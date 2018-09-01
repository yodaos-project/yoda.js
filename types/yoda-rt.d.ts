import { EventEmitter } from 'events'

declare global {
  namespace YodaRT {
    export class Activity extends EventEmitter {
      light: LightClient
      media: MediaClient
      tts: TtsClient

      appId: string
      appHome: string

      destroyAll(): void
      exit(): void
      get(key: string): Promise<any>
      getAppId(): string
      playSound(uri: string): Promise<void>
      setConfirm(intent: string, slot: string, options?: object, attrs?: object): Promise<void>
      setPickup(pickup: boolean, duration?: number): void
      setBackground(): Promise<void>
      setForeground(): Promise<void>

      on(event: 'ready', listener: () => void): this
      on(event: 'create', listener: () => void): this
      on(event: 'pause', listener: () => void): this
      on(event: 'resume', listener: () => void): this
      on(event: 'destroy', listener: () => void): this
      on(event: 'request', listener: (req: Request) => void): this
    }

    export class LightClient {
      play(uri: string, args?: object): Promise<void>
      stop(): Promise<void>
    }

    export class MediaClient {
      getLoopMode(): Promise<any>
      getPosition(): Promise<any>
      pause(): Promise<void>
      resume(): Promise<void>
      seek(pos: number): Promise<void>
      setLoopMode(loop: boolean): Promise<void>
      start(uri: string): Promise<void>
      stop(): Promise<void>
    }

    export class TtsClient {
      speak(text: string, callback: () => void): void
      stop(callback: () => void): void
    }

    export interface Request {
      appId: string
      intent: string
      slots: object[]
    }
  }
}
