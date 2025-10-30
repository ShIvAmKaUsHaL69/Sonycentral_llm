import { Navbar } from "@/components/admin-panel/navbar";

interface ContentLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function ContentLayout({ title, children }: ContentLayoutProps) {
  return (
    <div>
      {title === "Chat" ? (
        <>
          <Navbar title={title} />
          <div className="w-full flex flex-col m-0 p-0" style={{ height: 'calc(100vh - 56px)' }}>{children}</div>
        </>
      ) : (
        <>
          <Navbar title={title} />
          <div className="container pt-8 pb-8 px-4 sm:px-8">{children}</div>
        </>
      )}
    </div>
  );
}
