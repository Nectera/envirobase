"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ChevronRight, Badge, Mail, Phone } from "lucide-react";

interface Company {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName?: string | null;
  name?: string;
  title: string;
  email?: string;
  phone?: string;
  primary: boolean;
  company: Company | null;
}

export default function ContactsTable({ contacts }: { contacts: Contact[] }) {
  const [search, setSearch] = useState("");

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
      const q = search.toLowerCase();
      const matchesSearch =
        fullName.toLowerCase().includes(q) ||
        (contact.company?.name || "").toLowerCase().includes(q) ||
        (contact.title || "").toLowerCase().includes(q) ||
        (contact.email || "").toLowerCase().includes(q) ||
        (contact.phone || "").toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [contacts, search]);

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, company, or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:border-[#7BC143] focus:ring-1 focus:ring-[#7BC143]"
          />
        </div>
      </div>

      {/* Mobile List */}
      <div className="md:hidden space-y-2">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500">No contacts found</div>
        ) : (
          filteredContacts.map((contact) => (
            <Link key={contact.id} href={`/contacts/${contact.id}`} className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-4 py-3 hover:bg-slate-50 transition">
              <div className="min-w-0">
                <div className="font-medium text-sm text-slate-800 truncate">
                  {[contact.firstName, contact.lastName].filter(Boolean).join(" ")}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                  {contact.company && <span>{contact.company.name}</span>}
                  {contact.title && <span>{contact.company ? "·" : ""} {contact.title}</span>}
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 flex-shrink-0 ml-2" />
            </Link>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Primary</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                  No contacts found
                </td>
              </tr>
            ) : (
              filteredContacts.map((contact) => (
                <tr key={contact.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/contacts/${contact.id}`} className="font-medium text-[#7BC143] hover:text-[#6aad38]">
                      {[contact.firstName, contact.lastName].filter(Boolean).join(" ")}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{contact.title}</td>
                  <td className="px-6 py-4 text-sm">
                    {contact.company ? (
                      <Link href={`/companies/${contact.company.id}`} className="text-[#7BC143] hover:text-[#6aad38] font-medium">
                        {contact.company.name}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {contact.email ? (
                      <div className="flex items-center gap-1">
                        <Mail size={14} className="text-slate-400" />
                        {contact.email}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {contact.phone ? (
                      <div className="flex items-center gap-1">
                        <Phone size={14} className="text-slate-400" />
                        <a href={`tel:${contact.phone}`} className="hover:text-blue-600 transition">{contact.phone}</a>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {contact.primary && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-800">
                        <Badge size={12} />
                        Primary
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="inline-flex items-center gap-1 text-[#7BC143] hover:text-[#6aad38] font-medium text-sm transition-colors">
                      Edit
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
