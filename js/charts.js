const GREEN = {
  g900: "#0f7f58",
  g800: "#169c6d",
  g700: "#22b07e",
  g600: "#3ac18e",
  g500: "#5ed4a4",
  g400: "#8be5c2",
  g300: "#b6f2dc",
  fill: "rgba(22,156,109,0.18)",
  grid: "rgba(15,127,88,0.10)"
};

if (window.Chart) {
  Chart.defaults.font.family = '"Microsoft YaHei", "微软雅黑", "PingFang SC", sans-serif';
  Chart.defaults.font.size = 12;
  Chart.defaults.color = "#4d5868";
}

function chartOf(id, config) {
  const el = document.getElementById(id);
  if (!el) return null;
  return new Chart(el, config);
}

function lineSeries(label, data, color) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: GREEN.fill,
    borderWidth: 2.2,
    pointRadius: 2.5,
    pointHoverRadius: 4,
    pointBackgroundColor: color,
    tension: 0.32
  };
}

function barSeries(label, data, color) {
  return {
    label,
    data,
    backgroundColor: color,
    borderRadius: 7,
    maxBarThickness: 32
  };
}

function baseOptions() {
  return {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2,
    animation: false,
    plugins: { legend: { position: "bottom" } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: GREEN.grid } }
    }
  };
}

function percentOptions() {
  return {
    ...baseOptions(),
    scales: {
      ...baseOptions().scales,
      y: { beginAtZero: true, max: 100, grid: { color: GREEN.grid } }
    }
  };
}

function dualAxisOptions() {
  return {
    ...baseOptions(),
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: GREEN.grid } },
      y1: { position: "right", beginAtZero: true, grid: { drawOnChartArea: false } }
    }
  };
}

function renderOverviewCharts() {
  const d = window.HohhotData;
  chartOf("overviewPopulationChart", {
    type: "line",
    data: { labels: d.years, datasets: [lineSeries("常住人口(万人)", d.population, GREEN.g900), lineSeries("城镇化率(%)", d.urbanRate, GREEN.g600)] },
    options: baseOptions()
  });

  chartOf("overviewEconomyChart", {
    type: "bar",
    data: {
      labels: d.years,
      datasets: [
        barSeries("GDP(亿元)", d.gdp, GREEN.g600),
        { ...lineSeries("GDP增速(%)", d.gdpGrowth, GREEN.g900), yAxisID: "y1" }
      ]
    },
    options: dualAxisOptions()
  });
}

function renderPopulationCharts() {
  const d = window.HohhotData;
  chartOf("popTrendChart", { type: "line", data: { labels: d.years, datasets: [lineSeries("常住人口(万人)", d.population, GREEN.g900)] }, options: baseOptions() });
  chartOf("ageStructureChart", {
    type: "doughnut",
    data: { labels: ["0-14岁", "15-59岁", "60岁及以上"], datasets: [{ data: [13.91, 68.06, 18.03], backgroundColor: [GREEN.g500, GREEN.g700, GREEN.g900], borderWidth: 0 }] },
    options: { ...baseOptions(), aspectRatio: 1.7, scales: undefined }
  });
  chartOf("urbanRateChart", { type: "line", data: { labels: d.years, datasets: [lineSeries("城镇化率(%)", d.urbanRate, GREEN.g700)] }, options: baseOptions() });
  chartOf("netFlowChart", { type: "bar", data: { labels: d.years, datasets: [barSeries("净流入(万人)", d.netFlow, GREEN.g600)] }, options: baseOptions() });
}

function renderEconomyCharts() {
  const d = window.HohhotData;
  chartOf("gdpChart", { type: "bar", data: { labels: d.years, datasets: [barSeries("GDP(亿元)", d.gdp, GREEN.g700)] }, options: baseOptions() });
  chartOf("gdpGrowthChart", { type: "line", data: { labels: d.years, datasets: [lineSeries("GDP增速(%)", d.gdpGrowth, GREEN.g900)] }, options: baseOptions() });
  chartOf("industryStructureChart", {
    type: "pie",
    data: { labels: ["第一产业", "第二产业", "第三产业"], datasets: [{ data: d.industryStructure, backgroundColor: [GREEN.g400, GREEN.g600, GREEN.g900], borderWidth: 0 }] },
    options: { ...baseOptions(), aspectRatio: 1.7, scales: undefined }
  });
  chartOf("incomeChart", {
    type: "line",
    data: {
      labels: d.years,
      datasets: [
        lineSeries("全体居民", d.incomes.all, GREEN.g900),
        lineSeries("城镇居民", d.incomes.urban, GREEN.g700),
        lineSeries("农村居民", d.incomes.rural, GREEN.g500)
      ]
    },
    options: baseOptions()
  });
}

function renderIndustryCharts() {
  const d = window.HohhotData;
  chartOf("keyIndustryScaleChart", { type: "bar", data: { labels: d.keyIndustryScale.labels, datasets: [barSeries("产业规模指数", d.keyIndustryScale.values, GREEN.g700)] }, options: baseOptions() });
  chartOf("highTechCountChart", { type: "line", data: { labels: d.highTechCountYears, datasets: [lineSeries("高新技术企业(家)", d.highTechCount, GREEN.g900)] }, options: baseOptions() });
  chartOf("industryEmploymentChart", { type: "line", data: { labels: d.years, datasets: [lineSeries("就业吸纳占比(%)", d.industryEmploymentShare, GREEN.g600)] }, options: baseOptions() });
  chartOf("industryChainRadarChart", {
    type: "radar",
    data: {
      labels: d.industryChainScore.labels,
      datasets: [{ label: "完整度得分", data: d.industryChainScore.values, borderColor: GREEN.g900, backgroundColor: GREEN.fill, pointBackgroundColor: GREEN.g900, borderWidth: 2 }]
    },
    options: { ...baseOptions(), aspectRatio: 1.8, scales: undefined }
  });
}

function renderEducationCharts() {
  const d = window.HohhotData;
  chartOf("educationSpendingChart", { type: "bar", data: { labels: d.eduYears, datasets: [barSeries("教育支出(亿元)", d.eduSpending, GREEN.g700)] }, options: baseOptions() });
  chartOf("studentCountChart", { type: "line", data: { labels: d.eduYears, datasets: [lineSeries("在校生(万人)", d.students, GREEN.g900)] }, options: baseOptions() });
  chartOf("teacherCountChart", { type: "line", data: { labels: d.eduYears, datasets: [lineSeries("专任教师(万人)", d.teachers, GREEN.g600)] }, options: baseOptions() });
  chartOf("talentMatchChart", { type: "bar", data: { labels: d.eduYears, datasets: [barSeries("匹配指数", d.talentMatch, GREEN.g800)] }, options: percentOptions() });
}

function renderPlanningCharts() {
  const d = window.HohhotData;
  chartOf("forecastGdpChart", {
    type: "line",
    data: { labels: d.forecastYears, datasets: [lineSeries("基线情景", d.forecastGdp.baseline, GREEN.g600), lineSeries("政策情景", d.forecastGdp.policy, GREEN.g900)] },
    options: baseOptions()
  });
  chartOf("forecastPopulationChart", {
    type: "line",
    data: { labels: d.forecastYears, datasets: [lineSeries("基线情景", d.forecastPopulation.baseline, GREEN.g500), lineSeries("政策情景", d.forecastPopulation.policy, GREEN.g800)] },
    options: baseOptions()
  });
  chartOf("forecastUrbanRateChart", {
    type: "line",
    data: { labels: d.forecastYears, datasets: [lineSeries("基线情景", d.forecastUrbanRate.baseline, GREEN.g700), lineSeries("政策情景", d.forecastUrbanRate.policy, GREEN.g900)] },
    options: baseOptions()
  });
  chartOf("targetProgressChart", { type: "bar", data: { labels: d.targetProgress.labels, datasets: [barSeries("达成率(%)", d.targetProgress.values, GREEN.g800)] }, options: percentOptions() });
}
