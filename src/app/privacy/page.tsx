import type { Metadata } from "next";
import { Clause, LegalPage } from "@/components/LegalPage";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${brand.name} collects, uses and protects your personal information.`,
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      summary="What we collect, why we collect it, who else sees it, and how to get it removed."
    >
      <Clause heading="What we collect">
        <p>
          <strong className="text-ink-900">When you buy:</strong> your name, email address, phone
          number and delivery address. We need these to take payment and deliver the order.
        </p>
        <p>
          <strong className="text-ink-900">When you create an account:</strong> your name and
          email, plus a one-way cryptographic hash of your password. We never store the password
          itself and cannot recover it.
        </p>
        <p>
          <strong className="text-ink-900">Automatically:</strong> your IP address, used to rate
          limit sign-in and checkout against abuse.
        </p>
        <p>
          <strong className="text-ink-900">We never collect</strong> card numbers, UPI IDs or bank
          credentials. Those go directly to our payment gateway and never reach our servers.
        </p>
      </Clause>

      <Clause heading="Cookies">
        <p>
          We set a small number of strictly functional cookies, all of them HTTP-only: one to keep
          you signed in, one to remember your shopping bag, and one so a guest can return to an
          order they placed. There are no advertising or cross-site tracking cookies on this site.
        </p>
        <p>
          Your theme preference (light or dark) is stored in your browser and never sent to us.
        </p>
      </Clause>

      <Clause heading="Who else sees your data">
        <p>
          Only the processors we need to run the shop: our payment gateway, our hosting and
          database providers, our email provider for order confirmations, and the courier
          delivering your parcel. Each receives only what that task requires — the courier gets
          your address, the gateway does not.
        </p>
        <p>We do not sell your personal information, and we never have.</p>
      </Clause>

      <Clause heading="How long we keep it">
        <p>
          Order records, including the delivery address as it stood at the time, are retained for
          as long as tax and company law require. Account details are kept until you ask us to
          delete them. Abandoned shopping bags expire on their own.
        </p>
      </Clause>

      <Clause heading="Your rights">
        <p>
          You can ask for a copy of the personal data we hold about you, ask us to correct it, or
          ask us to delete your account. Write to{" "}
          <a href={`mailto:${brand.supportEmail}`} className="text-royal-600 hover:underline">
            {brand.supportEmail}
          </a>{" "}
          and we will respond within thirty days. Note that we cannot delete completed order
          records we are legally required to retain.
        </p>
      </Clause>

      <Clause heading="Security">
        <p>
          Traffic is encrypted in transit. Passwords are hashed. Sessions are signed and stored in
          HTTP-only cookies that JavaScript cannot read. Access to production data is limited to
          the people who need it.
        </p>
      </Clause>

      <Clause heading="Contact">
        <p>
          {brand.legal.entityName}, {brand.legal.address}. Email{" "}
          <a href={`mailto:${brand.supportEmail}`} className="text-royal-600 hover:underline">
            {brand.supportEmail}
          </a>
          .
        </p>
      </Clause>
    </LegalPage>
  );
}
