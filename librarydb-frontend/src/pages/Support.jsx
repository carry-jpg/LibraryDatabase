import React from "react";
import { APP_VERSION } from "../config/appMeta";

function ContactRow({ label, value, href }) {
  return (
    <div className="text-sm text-[color:var(--text-secondary)]">
      <span className="font-semibold text-[color:var(--text-primary)]">
        {label}:
      </span>{" "}
      {href ? (
        <a
          className="text-[color:var(--accent)] hover:underline"
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noreferrer" : undefined}
        >
          {value}
        </a>
      ) : (
        <span>{value}</span>
      )}
    </div>
  );
}

function PersonCard({
  name,
  imgUrl,
  imgPos = "50% 50%",
  email,
  instagramUrl,
  linkedinUrl,
}) {
  return (
    <div className="border border-[color:var(--border)] rounded-lg p-4 bg-[color:var(--panel-bg)]">
      <div className="flex items-center gap-4">
        <img
          src={imgUrl}
          alt={name}
          className="w-20 h-20 shrink-0 rounded-lg border border-[color:var(--border)] bg-[color:var(--active-bg)] object-cover"
          style={{ objectPosition: imgPos }}
        />

        <div className="min-w-0">
          <div className="font-semibold text-[color:var(--text-primary)]">
            {name}
          </div>

          <div className="mt-2 space-y-1">
            <ContactRow label="Email" value={email} href={`mailto:${email}`} />

            {instagramUrl ? (
              <ContactRow
                label="Instagram"
                value="Instagram"
                href={instagramUrl}
              />
            ) : null}

            {linkedinUrl ? (
              <ContactRow label="LinkedIn" value="LinkedIn" href={linkedinUrl} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Support() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-2 text-[color:var(--text-primary)]">
        About
      </h1>

      <p className="text-sm text-[color:var(--text-secondary)] mb-6">
        TomeNest is a lightweight library app for browsing books, managing stock,
        saving wishlist items, and tracking rentals in one place.
      </p>

      <section className="mb-8 border border-[color:var(--border)] rounded-lg p-5 bg-[color:var(--panel-bg)]">
        <h2 className="text-lg font-semibold text-[color:var(--text-primary)] mb-2">
          App info
        </h2>

        <div className="text-sm text-[color:var(--text-secondary)]">
          Version: <span className="font-mono">{APP_VERSION}</span>
        </div>

        <div className="text-sm text-[color:var(--text-secondary)] mt-2">
          Built for simple day-to-day library tracking with a clean UI and fast
          searching.
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 text-[color:var(--text-primary)]">
          Contacts
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PersonCard
            name="Baksa Márk"
            imgUrl="/assets/team/mark.jpg"
            imgPos="30% 50%"
            email="contact@markbaksa.com"
            instagramUrl="https://www.instagram.com/mark.baksa/"
            linkedinUrl="https://www.linkedin.com/in/m%C3%A1rk-baksa-6b7b87273/"
          />

          <PersonCard
            name="Görög Bálint Szilveszter"
            imgUrl="/assets/team/balint.jpg"
            imgPos="50% 35%"
            email="es24-gorog@ipari.vein.hu"
            instagramUrl="https://www.instagram.com/gorog_balint/"
            linkedinUrl={null}
          />
        </div>
      </section>
    </div>
  );
}
