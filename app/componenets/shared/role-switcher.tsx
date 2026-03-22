'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RoleSwitcher({
  roles
}: {
  roles: { label: string; href: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-bold hover:bg-gray-200"
      >
        Switch Role
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white border rounded-xl shadow-lg overflow-hidden">
          {roles.map((r) => (
            <button
              key={r.href}
              onClick={() => router.push(r.href)}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}