import { prisma } from "@/lib/prisma";

export default async function Home() {
  const hellos = await prisma.hello.findMany();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Home PM</h1>
      <ul className="space-y-2">
        {hellos.map((h) => (
          <li key={h.id} className="text-gray-700">
            {h.message}
          </li>
        ))}
      </ul>
    </main>
  );
}
