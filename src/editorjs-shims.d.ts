/** Workaround: @editorjs/embed ships types but package "exports" block TS resolution for dynamic import(). */
declare module "@editorjs/embed" {
  const Embed: import("@editorjs/editorjs").BlockToolConstructable;
  export default Embed;
}

declare module "@editorjs/simple-image" {
  const SimpleImage: import("@editorjs/editorjs").BlockToolConstructable;
  export default SimpleImage;
}
