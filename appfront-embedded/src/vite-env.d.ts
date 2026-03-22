/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FUNCTIONS_URL: string;
  readonly VITE_SHOPIFY_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// App Bridge nav menu custom element
declare namespace JSX {
  interface IntrinsicElements {
    "ui-nav-menu": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
  }
}

// App Bridge global (injected via script tag in index.html)
declare const shopify: {
  idToken(): Promise<string>;
  toast: {
    show(message: string, options?: { duration?: number; isError?: boolean }): void;
  };
  navigate(url: string): void;
};
