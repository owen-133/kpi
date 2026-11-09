// CSS module class names of the board, for a type check that runs before Next has written its own declarations.
declare module '*.module.css' {
  const styles: { readonly [className: string]: string };
  export default styles;
}
