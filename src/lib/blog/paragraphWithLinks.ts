import type { SanitizerConfig } from "@editorjs/editorjs";
import Paragraph from "@editorjs/paragraph";

/**
 * Paragraph with sanitizer rules that keep inline links (built-in Link inline tool).
 * The stock @editorjs/paragraph only allows `br`, which strips `<a>` on save.
 */
export default class ParagraphWithLinks extends Paragraph {
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
    } as unknown as SanitizerConfig;
  }
}
