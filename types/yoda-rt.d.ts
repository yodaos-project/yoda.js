import { EventEmitter } from 'events'

declare global {
  namespace YodaRT {
    export class Activity extends EventEmitter {
      light: LightClient
      localStorage: LocalStorage
      media: MediaClient
      tts: TtsClient

      destroyAll(): void
      exit(): void
      get(key: string): Promise<any>
      getAppId(): string
      playSound(uri: string): Promise<void>
      setConfirm(intent: string, slot: string, options?: object, attrs?: object): void
      setPickup(pickup: boolean): void

      on(event: 'create', listener: () => void): this
      on(event: 'pause', listener: () => void): this
      on(event: 'resume', listener: () => void): this
      on(event: 'destroy', listener: () => void): this
      on(event: 'onrequest', listener: (nlp: NlpObject, action: ActionObject) => void): this
    }

    export class LightClient {
      play(uri: string, args?: object): Promise<void>
      stop(): Promise<void>
    }

    export class LocalStorage {
      getItem(key: string): any
      setItem(key: string, value: any): void
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

    export interface NlpObject {
      appId: string
      cloud: boolean
      intent: string
      slots: object[]
    }

    export interface ActionObject {
      appId: string
      startWithActiveWord: boolean
      response: {
        action: object
      }
    }
  }
}
