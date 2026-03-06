export default function Features() {
  const features = [
    {
      title: "AI Expense Tracking",
      desc: "Automatically categorize and analyze your spending patterns."
    },
    {
      title: "Finance Score",
      desc: "Understand your financial health with a smart scoring system."
    },
    {
      title: "Deep Learning Forecast",
      desc: "Predict future expenses using LSTM AI models."
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">

        <h2 className="text-3xl font-bold text-center mb-12">
          Powerful Financial Tools
        </h2>

        <div className="grid md:grid-cols-3 gap-8">

          {features.map((f, i) => (
            <div
              key={i}
              className="p-6 border rounded-xl hover:shadow-lg transition"
            >
              <h3 className="text-xl font-semibold mb-2">
                {f.title}
              </h3>

              <p className="text-gray-600">
                {f.desc}
              </p>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}