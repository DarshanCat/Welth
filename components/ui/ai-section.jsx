export default function AISection() {
  return (
    <section className="py-20">

      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12">

        <div>
          <h2 className="text-3xl font-bold mb-6">
            Built With Artificial Intelligence
          </h2>

          <ul className="space-y-4 text-gray-600">

            <li>✔ AI chatbot financial assistant</li>

            <li>✔ Deep learning expense prediction</li>

            <li>✔ Finance health scoring</li>

            <li>✔ Smart savings goal tracking</li>

          </ul>
        </div>

        <img
          src="/ai-finance.png"
          className="rounded-xl shadow-lg"
        />

      </div>

    </section>
  );
}