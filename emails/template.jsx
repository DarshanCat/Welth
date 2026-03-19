import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// Dummy data for preview
const PREVIEW_DATA = {
  monthlyReport: {
    userName: "John Doe",
    type: "monthly-report",
    data: {
      month: "December",
      stats: {
        totalIncome: 5000,
        totalExpenses: 3500,
        byCategory: {
          housing: 1500,
          groceries: 600,
          transportation: 400,
          entertainment: 300,
          utilities: 700,
        },
      },
      insights: [
        "Your housing expenses are 43% of your total spending - consider reviewing your housing costs.",
        "Great job keeping entertainment expenses under control this month!",
        "Setting up automatic savings could help you save 20% more of your income.",
      ],
    },
  },
  budgetAlert: {
    userName: "John Doe",
    type: "budget-alert",
    data: {
      percentageUsed: 85,
      budgetAmount: 4000,
      totalExpenses: 3400,
    },
  },
};

export default function EmailTemplate({
  userName = "",
  type = "monthly-report",
  data = {},
}) {
  const stats = data?.stats || {};

  if (type === "monthly-report") {
    return (
      <Html>
        <Head />
        <Preview>Your Monthly Financial Report</Preview>
        <Body style={styles.body}>
          <Container style={styles.container}>
            <Heading style={styles.title}>Monthly Financial Report</Heading>

            <Text style={styles.text}>Hello {userName},</Text>
            <Text style={styles.text}>
              Here&rsquo;s your financial summary for {data?.month || "N/A"}:
            </Text>

            {/* Main Stats */}
            <Section style={styles.statsContainer}>
              <div style={styles.stat}>
                <Text style={styles.text}>Total Income</Text>
                <Text style={styles.heading}>
                  ${stats?.totalIncome ?? 0}
                </Text>
              </div>
              <div style={styles.stat}>
                <Text style={styles.text}>Total Expenses</Text>
                <Text style={styles.heading}>
                  ${stats?.totalExpenses ?? 0}
                </Text>
              </div>
              <div style={styles.stat}>
                <Text style={styles.text}>Net</Text>
                <Text style={styles.heading}>
                  ${(stats?.totalIncome ?? 0) - (stats?.totalExpenses ?? 0)}
                </Text>
              </div>
            </Section>

            {/* Category Breakdown */}
            {stats?.byCategory && (
              <Section style={styles.section}>
                <Heading style={styles.heading}>Expenses by Category</Heading>
                {Object.entries(stats.byCategory).map(
                  ([category, amount]) => (
                    <div key={category} style={styles.row}>
                      <Text style={styles.text}>{category}</Text>
                      <Text style={styles.text}>${amount}</Text>
                    </div>
                  )
                )}
              </Section>
            )}

            {/* AI Insights */}
            {data?.insights && (
              <Section style={styles.section}>
                <Heading style={styles.heading}>Welth Insights</Heading>
                {data.insights.map((insight, index) => (
                  <Text key={index} style={styles.text}>
                    • {insight}
                  </Text>
                ))}
              </Section>
            )}

            <Text style={styles.footer}>
              Thank you for using Welth. Keep tracking your finances for better
              financial health!
            </Text>
          </Container>
        </Body>
      </Html>
    );
  }

  if (type === "budget-alert") {
    return (
      <Html>
        <Head />
        <Preview>Budget Alert</Preview>
        <Body style={styles.body}>
          <Container style={styles.container}>
            <Heading style={styles.title}>Budget Alert</Heading>

            <Text style={styles.text}>Hello {userName},</Text>
            <Text style={styles.text}>
              You&rsquo;ve used {data?.percentageUsed?.toFixed?.(1) ?? 0}% of your
              monthly budget.
            </Text>

            <Section style={styles.statsContainer}>
              <div style={styles.stat}>
                <Text style={styles.text}>Budget Amount</Text>
                <Text style={styles.heading}>${data?.budgetAmount ?? 0}</Text>
              </div>
              <div style={styles.stat}>
                <Text style={styles.text}>Spent So Far</Text>
                <Text style={styles.heading}>${data?.totalExpenses ?? 0}</Text>
              </div>
              <div style={styles.stat}>
                <Text style={styles.text}>Remaining</Text>
                <Text style={styles.heading}>
                  ${(data?.budgetAmount ?? 0) - (data?.totalExpenses ?? 0)}
                </Text>
              </div>
            </Section>
          </Container>
        </Body>
      </Html>
    );
  }

  if (type === "offer") {
    return (
      <Html>
        <Head />
        <Preview>Exclusive Financial Offer</Preview>
        <Body style={styles.body}>
          <Container style={styles.container}>
            <Heading style={styles.title}>Special Offer For You</Heading>

            <Text style={styles.text}>Hello {userName},</Text>
            <Text style={styles.text}>
              Based on your excellent financial profile, we have a customized offer tailored just for you!
            </Text>

            <Section style={styles.statsContainer}>
              <div style={{ ...styles.stat, backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <Text style={{ ...styles.heading, color: "#166534" }}>{data?.offerTitle ?? "Special Offer"}</Text>
                <Text style={{ ...styles.text, color: "#15803d" }}>
                  {data?.offerDetails ?? "Click the link in your dashboard to view this exclusive opportunity."}
                </Text>
              </div>
            </Section>

            <Text style={styles.text}>
              Head over to your Welth Dashboard Notifications to claim this offer or learn more!
            </Text>
            
            <Text style={styles.footer}>
              Thank you for using Welth. Keep tracking your finances for better financial health!
            </Text>
          </Container>
        </Body>
      </Html>
    );
  }

  if (type === "subscription-alert") {
    return (
      <Html>
        <Head />
        <Preview>Unused Subscription Alert</Preview>
        <Body style={styles.body}>
          <Container style={styles.container}>
            <Heading style={styles.title}>Subscription Leak Detected</Heading>
            <Text style={styles.text}>Hello {userName},</Text>
            <Text style={styles.text}>
              Our AI has detected a recurring charge that you might not be using actively.
            </Text>
            <Section style={styles.statsContainer}>
              <div style={{ ...styles.stat, backgroundColor: "#fff1f2", border: "1px solid #fecdd3" }}>
                <Text style={{ ...styles.heading, color: "#9f1239" }}>{data?.serviceName}</Text>
                <Text style={{ ...styles.text, color: "#be123c" }}>
                  Recurring Amount: ${data?.amount} / {data?.interval}
                </Text>
              </div>
            </Section>
            <Text style={styles.text}>
              If you wish to cancel this subscription, click the button below to automatically generate a cancellation request email targeting their support department.
            </Text>
            <Section style={{ textAlign: "center", marginTop: "20px" }}>
              <a 
                href={data?.cancellationMailto || "#"} 
                style={{ backgroundColor: "#e11d48", color: "#fff", padding: "12px 20px", textDecoration: "none", borderRadius: "6px", fontWeight: "bold", display: "inline-block" }}
              >
                1-Click Cancel Subscription
              </a>
            </Section>
          </Container>
        </Body>
      </Html>
    );
  }
}

//
// Auto-preview with correct data
//
EmailTemplate.PreviewProps = PREVIEW_DATA.monthlyReport;

// If you want to preview budget alert instead, use this:
// EmailTemplate.PreviewProps = PREVIEW_DATA.budgetAlert;


//
// Styles
//
const styles = {
  body: {
    backgroundColor: "#f6f9fc",
    fontFamily: "-apple-system, sans-serif",
  },
  container: {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "20px",
    borderRadius: "5px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  },
  title: {
    color: "#1f2937",
    fontSize: "32px",
    fontWeight: "bold",
    textAlign: "center",
    margin: "0 0 20px",
  },
  heading: {
    color: "#1f2937",
    fontSize: "20px",
    fontWeight: "600",
    margin: "0 0 16px",
  },
  text: {
    color: "#4b5563",
    fontSize: "16px",
    margin: "0 0 16px",
  },
  section: {
    marginTop: "32px",
    padding: "20px",
    backgroundColor: "#f9fafb",
    borderRadius: "5px",
    border: "1px solid #e5e7eb",
  },
  statsContainer: {
    margin: "32px 0",
    padding: "20px",
    backgroundColor: "#f9fafb",
    borderRadius: "5px",
  },
  stat: {
    marginBottom: "16px",
    padding: "12px",
    backgroundColor: "#fff",
    borderRadius: "4px",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: "1px solid #e5e7eb",
  },
  footer: {
    color: "#6b7280",
    fontSize: "14px",
    textAlign: "center",
    marginTop: "32px",
    paddingTop: "16px",
    borderTop: "1px solid #e5e7eb",
  },
};
