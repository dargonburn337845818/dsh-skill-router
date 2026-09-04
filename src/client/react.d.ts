declare module 'react' {
  export function createElement(type: any, props?: any, ...children: any[]): any
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void
  export function useRef<T>(initial: T): { current: T }
}
