import React from "react";
import { APP_VERSION } from "../config/appMeta";

function PersonCard({ name, role, email, imgUrl }) {
  return (
    <div className="border border-[color:var(--border)] rounded-lg p-4 bg-[color:var(--panel-bg)]">
      <div className="flex items-center gap-4">
        <img
          src={imgUrl}
          alt={name}
          className="w-14 h-14 rounded-full object-cover border border-[color:var(--border)]"
        />
        <div>
          <div className="font-semibold text-[color:var(--text-primary)]">{name}</div>
          <div className="text-sm text-[color:var(--text-secondary)]">{role}</div>
          <div className="text-sm text-[color:var(--text-secondary)]">{email}</div>
        </div>
      </div>
    </div>
  );
}

export default function Support() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-[color:var(--text-primary)]">Support</h1>

      <section className="mb-8 border border-[color:var(--border)] rounded-lg p-5 bg-[color:var(--panel-bg)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)] mb-2">Contact</h2>
            <div className="text-sm text-[color:var(--text-secondary)]">Email: support@example.com</div>
            <div className="text-sm text-[color:var(--text-secondary)]">Phone: +36 30 123 4567</div>
            <div className="text-sm text-[color:var(--text-secondary)]">Address: 123 Library St, Budapest, HU</div>
            <div className="text-sm text-[color:var(--text-secondary)] mt-3">App version: {APP_VERSION}</div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)] mb-2">Links</h2>
            <div className="text-sm">
              <a className="text-[color:var(--accent)] hover:underline" href="https://github.com/" target="_blank" rel="noreferrer">
                GitHub
              </a>
            </div>
            <div className="text-sm">
              <a className="text-[color:var(--accent)] hover:underline" href="https://www.linkedin.com/" target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            </div>
            <div className="text-sm">
              <a className="text-[color:var(--accent)] hover:underline" href="https://www.instagram.com/" target="_blank" rel="noreferrer">
                Instagram
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 text-[color:var(--text-primary)]">People</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PersonCard
            name="Alex Example"
            role="Creator"
            email="alex@example.com"
            imgUrl="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
          />
          <PersonCard
            name="Jamie Example"
            role="Creator"
            email="jamie@example.com"
            imgUrl="https://api.dicebear.com/7.x/avataaars/svg?seed=Jamie"
          />
        </div>
      </section>
    </div>
  );
}
