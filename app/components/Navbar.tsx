import Link from "next/link";
import LogoutButton from "../LogoutButton";

export default function Navbar() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-lg font-semibold"
        >
          FormBuilder
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            My Forms
          </Link>

          <Link
            href="/forms/new"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Create Form
          </Link>

          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}