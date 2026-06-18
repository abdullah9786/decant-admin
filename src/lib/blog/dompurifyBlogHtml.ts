import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "sub",
  "sup",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "code",
  "hr",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "figure",
  "figcaption",
  "div",
  "span",
];

const ALLOWED_ATTR = [
  "href",
  "title",
  "src",
  "alt",
  "width",
  "height",
  "class",
  "colspan",
  "rowspan",
  "scope",
  "loading",
  "decoding",
  "rel",
  "target",
];

/** Client-side preview only; API re-sanitizes with nh3. */
export function previewSanitizedBlogHtml(html: string): string {
  if (typeof window === "undefined") return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
  });
}
