function chartOf(id, config) {
  const el = document.getElementById(id);
  if (!el) return null;
  return new Chart(el, config);
}

function baseOptions() {
  return {
    responsive: false,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { position: "bottom" } }
  };
}

function renderOverviewCharts() {
  const d = window.HohhotData;
  chartOf("overviewPopulationChart", {
    type: "line",
    data: {
      labels: d.years,
      datasets: [
        { label: "常住人口(万人)", data: d.population, borderColor: "#0b63ce", tension: 0.3 },
        { label: "城镇化率(%)", data: d.urbanRate, borderColor: "#059669", tension: 0.3 }
      ]
    },
    options: baseOptions()
  });

  chartOf("overviewEconomyChart", {
    type: "bar",
    data: {
      labels: d.years,
      datasets: [
        { type: "bar", label: "GDP(亿元)", data: d.gdp, backgroundColor: "rgba(14,116,144,0.75)" },
        { type: "line", label: "GDP增速(%)", data: d.gdpGrowth, borderColor: "#dc2626", yAxisID: "y1", tension: 0.3 }
      ]
    },
    options: {
      ...baseOptions(),
      scales: {
        y: { beginAtZero: true },
        y1: { position: "right", beginAtZero: true, grid: { drawOnChartArea: false } }
      }
    }
  });
}

function renderPopulationCharts() {
  const d = window.HohhotData;
  chartOf("popTrendChart", {
    type: "line",
    data: { labels: d.years, datasets: [{ label: "常住人口(万人)", data: d.population, borderColor: "#0b63ce", tension: 0.35 }] },
    options: baseOptions()
  });

  chartOf("ageStructureChart", {
    type: "doughnut",
    data: { labels: ["0-14岁", "15-59岁", "60岁及以上"], datasets: [{ data: [13.91, 68.06, 18.03], backgroundColor: ["#0ea5e9", "#22c55e", "#f59e0b"] }] },
    options: baseOptions()
  });

  chartOf("urbanRateChart", {
    type: "line",
    data: { labels: d.years, datasets: [{ label: "城镇化率(%)", data: d.urbanRate, borderColor: "#059669", tension: 0.3 }] },
    options: baseOptions()
  });

  chartOf("netFlowChart", {
    type: "bar",
    data: { labels: d.years, datasets: [{ label: "净流入(万人)", data: d.netFlow, backgroundColor: "rgba(2,132,199,0.75)" }] },
    options: baseOptions()
  });
}

function renderEconomyCharts() {
  const d = window.HohhotData;
  chartOf("gdpChart", {
    type: "bar",
    data: { labels: d.years, datasets: [{ label: "GDP(亿元)", data: d.gdp, backgroundColor: "rgba(14,116,144,0.75)" }] },
    options: baseOptions()
  });

  chartOf("gdpGrowthChart", {
    type: "line",
    data: { labels: d.years, datasets: [{ label: "GDP增速(%)", data: d.gdpGrowth, borderColor: "#dc2626", tension: 0.25 }] },
    options: baseOptions()
  });

  chartOf("industryStructureChart", {
    type: "pie",
    data: { labels: ["第一产业", "第二产业", "第三产业"], datasets: [{ data: d.industryStructure, backgroundColor: ["#f59e0b", "#10b981", "#0b63ce"] }] },
    options: baseOptions()
  });

  chartOf("incomeChart", {
    type: "line",
    data: {
      labels: d.years,
      datasets: [
        { label: "全体居民", data: d.incomes.all, borderColor: "#1d4ed8", tension: 0.3 },
        { label: "城镇居民", data: d.incomes.urban, borderColor: "#16a34a", tension: 0.3 },
        { label: "农村居民", data: d.incomes.rural, borderColor: "#ea580c", tension: 0.3 }
      ]
    },
    options: baseOptions()
  });
}

function renderIndustryCharts() {
  const d = window.HohhotData;
  chartOf("keyIndustryScaleChart", {
    type: "bar",
    data: { labels: d.keyIndustryScale.labels, datasets: [{ label: "产业规模指数", data: d.keyIndustryScale.values, backgroundColor: "#0284c7" }] },
    options: baseOptions()
  });

  chartOf("highTechCountChart", {
    type: "line",
    data: { labels: d.highTechCountYears, datasets: [{ label: "高新技术企业(家)", data: d.highTechCount, borderColor: "#7c3aed", tension: 0.3 }] },
    options: baseOptions()
  });

  chartOf("industryEmploymentChart", {
    type: "line",
    data: { labels: d.years, datasets: [{ label: "就业吸纳占比(%)", data: d.industryEmploymentShare, borderColor: "#0f766e", tension: 0.3 }] },
    options: baseOptions()
  });

  chartOf("industryChainRadarChart", {
    type: "radar",
    data: { labels: d.industryChainScore.labels, datasets: [{ label: "完整度得分", data: d.industryChainScore.values, borderColor: "#0b63ce", backgroundColor: "rgba(11,99,206,0.25)" }] },
    options: baseOptions()
  });
}

function renderEducationCharts() {
  const d = window.HohhotData;
  chartOf("educationSpendingChart", {
    type: "bar",
    data: { labels: d.eduYears, datasets: [{ label: "教育支出(亿元)", data: d.eduSpending, backgroundColor: "#0891b2" }] },
    options: baseOptions()
  });

  chartOf("studentCountChart", {
    type: "line",
    data: { labels: d.eduYears, datasets: [{ label: "在校生(万人)", data: d.students, borderColor: "#2563eb", tension: 0.3 }] },
    options: baseOptions()
  });

  chartOf("teacherCountChart", {
    type: "line",
    data: { labels: d.eduYears, datasets: [{ label: "专任教师(万人)", data: d.teachers, borderColor: "#16a34a", tension: 0.3 }] },
    options: baseOptions()
  });

  chartOf("talentMatchChart", {
    type: "bar",
    data: { labels: d.eduYears, datasets: [{ label: "匹配指数", data: d.talentMatch, backgroundColor: "#7c3aed" }] },
    options: {
      ...baseOptions(),
      scales: { y: { beginAtZero: true, max: 100 } }
    }
  });
}

function renderPlanningCharts() {
  const d = window.HohhotData;
  chartOf("forecastGdpChart", {
    type: "line",
    data: { labels: d.forecastYears, datasets: [{ label: "基线情景", data: d.forecastGdp.baseline, borderColor: "#0b63ce", tension: 0.3 }, { label: "政策情景", data: d.forecastGdp.policy, borderColor: "#dc2626", tension: 0.3 }] },
    options: baseOptions()
  });

  chartOf("forecastPopulationChart", {
    type: "line",
    data: { labels: d.forecastYears, datasets: [{ label: "基线情景", data: d.forecastPopulation.baseline, borderColor: "#0284c7", tension: 0.3 }, { label: "政策情景", data: d.forecastPopulation.policy, borderColor: "#16a34a", tension: 0.3 }] },
    options: baseOptions()
  });

  chartOf("forecastUrbanRateChart", {
    type: "line",
    data: { labels: d.forecastYears, datasets: [{ label: "基线情景", data: d.forecastUrbanRate.baseline, borderColor: "#7c3aed", tension: 0.3 }, { label: "政策情景", data: d.forecastUrbanRate.policy, borderColor: "#ea580c", tension: 0.3 }] },
    options: baseOptions()
  });

  chartOf("targetProgressChart", {
    type: "bar",
    data: { labels: d.targetProgress.labels, datasets: [{ label: "达成率(%)", data: d.targetProgress.values, backgroundColor: "#0f766e" }] },
    options: {
      ...baseOptions(),
      scales: { y: { beginAtZero: true, max: 100 } }
    }
  });
}
