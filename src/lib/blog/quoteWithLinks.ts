import type { SanitizerConfig } from "@editorjs/editorjs";
import Quote from "@editorjs/quote";

/** Quote + caption allow inline links (same issue as paragraph default sanitizer). */
export default class QuoteWithLinks extends Quote {
  static get sanitize(): SanitizerConfig {
    return {
      text: {
        br: true,
        a: {
          href: true,
          target: true,
          rel: true,
          class: true,
        },
        b: true,
        strong: true,
        i: true,
        em: true,
        u: true,
        mark: true,
        span: { class: true },
      },
      caption: {
        br: true,
        a: {
          href: true,
          target: true,
          rel: true,
          class: true,
        },
        b: true,
        strong: true,
        i: true,
        em: true,
      },
      alignment: {},
    } as unknown as SanitizerConfig;
  }
}
