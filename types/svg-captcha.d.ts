declare module 'svg-captcha' {
  export interface CaptchaObj {
    data: string;
    text: string;
  }

  export interface MathExprOptions {
    mathMin?: number;
    mathMax?: number;
    mathOperator?: '+' | '-' | '+' | '×';
    color?: boolean;
    background?: string;
    width?: number;
    height?: number;
    fontSize?: number;
  }

  export interface CreateOptions {
    size?: number;
    ignoreChars?: string;
    noise?: number;
    color?: boolean;
    background?: string;
    width?: number;
    height?: number;
    fontSize?: number;
    charPreset?: string;
    charSet?: string;
    ignoreCase?: boolean;
    loadFont?: {
      normal: string;
      bold: string;
      bolditalic: string;
      italic: string;
    };
  }

  export function create(options?: CreateOptions): CaptchaObj;
  export function createMathExpr(options?: MathExprOptions): CaptchaObj;
}
