type FragmentWebProps = {
  url: string;
  title?: string;
  width?: number;
};

export function FragmentWeb({ url, title, width }: FragmentWebProps) {
  return (
    <iframe
      src={url}
      title={title ?? "Tool Preview"}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      className="w-full h-full border-0"
      style={width ? { width: `${width}px` } : undefined}
      loading="lazy"
    />
  );
}
