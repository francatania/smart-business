interface PageHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function PageHeading({ description, eyebrow, title }: PageHeadingProps) {
  return (
    <header className="page-heading">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <span>{description}</span>
    </header>
  );
}
