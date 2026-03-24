type FragmentWebProps = {
  url: string;
  title?: string;
};

export function FragmentWeb({ url, title }: FragmentWebProps) {
  return (
    <iframe
      src={url}
      title={title ?? "App Preview"}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      className="w-full h-full border-0"
      loading="lazy"
    />
  );
}
