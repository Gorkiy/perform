import { uuid } from './config.js';

function quantile(arr, q) {
	if (!arr) return 0;
	const sorted = arr.sort((a, b) => a - b);
	const pos = (sorted.length - 1) * q;
	const base = Math.floor(pos);
	const rest = pos - base;

	if (sorted[base + 1] !== undefined) {
		return Math.floor(sorted[base] + rest * (sorted[base + 1] - sorted[base]));
	} else {
		return Math.floor(sorted[base]);
	}
};

function prepareData(result) {
	return result.data.map(item => {
		item.date = item.timestamp.split('T')[0];

		return item;
	});
}

// рассчитывает метрики за несколько день
function addMetricByRange(data, page, name, dateFromString, dateToString) {
	const sampleData = data.filter(item => {
		const isCurrent = item.page == page && item.name == name;
		const curDate = getTimestampFromSting(item.date);
		const dateFrom = getTimestampFromSting(dateFromString);
		const dateTo = getTimestampFromSting(dateToString);
		dateTo.setHours(23);
		dateTo.setMinutes(59);
		dateTo.setSeconds(59);

		const isValidDate = curDate.getTime() > dateFrom.getTime() && curDate.getTime() < dateTo.getTime();

		return isCurrent && isValidDate;
	}).map(item => item.value);

	let result = {};

	result.hits = sampleData.length;
	result.p25 = quantile(sampleData, 0.25);
	result.p50 = quantile(sampleData, 0.5);
	result.p75 = quantile(sampleData, 0.75);
	result.p95 = quantile(sampleData, 0.95);

	return result;
}

// показывает метрики за выбранные дни
function showMetricByPeriod(data, page, dateFrom, dateTo) {
	console.log(`All metrics from ${dateFrom} to ${dateTo}:`);
	let table = {};

	table.connect = addMetricByRange(data, page, 'connect', dateFrom, dateTo);
	table.ttfb = addMetricByRange(data, page, 'ttfb', dateFrom, dateTo);
	table.loaded = addMetricByRange(data, page, 'loaded', dateFrom, dateTo);
	table.result = addMetricByRange(data, page, 'result', dateFrom, dateTo);
	table.paint = addMetricByDate(data, page, 'first-contentful-paint', dateFrom, dateTo);
	table.domComplete = addMetricByDate(data, page, 'domComplete', dateFrom, dateTo);
	console.table(table);
}

// Рассчитать метрику сессии
function addMetricBySession(data, page, name, session) {
	let sampleData = data
		.filter(item => item.requestId == session && item.name == name && item.page == page)
		.map(item => item.value);

	let result = {};

	result.p25 = quantile(sampleData, 0.25);
	result.p50 = quantile(sampleData, 0.5);
	result.p75 = quantile(sampleData, 0.75);
	result.p95 = quantile(sampleData, 0.95);

	return result;
}

// показать сессию пользователя
function showSession(data, page, session) {
	console.log(`All metrics for session ID #${session}:`);

	let table = {};
	table.connect = addMetricBySession(data, page, 'connect', session);
	table.ttfb = addMetricBySession(data, page, 'ttfb', session);
	table.loaded = addMetricBySession(data, page, 'loaded', session);
	table.result = addMetricBySession(data, page, 'result', session);

	console.table(table);
}

// сравнить метрику в разных срезах
function compareMetric(data, page, dateFrom, dateTo) {
	const desktopData = data.filter(item => item.additional.platform === 'desktop');
	const touchData = data.filter(item => item.additional.platform === 'touch'
	);

	console.log('* * * Desktop devices * * *');
	showMetricByPeriod(desktopData, page, dateFrom, dateTo)

	console.log('* * * Touch devices * * *');
	showMetricByPeriod(touchData, page, dateFrom, dateTo)
}

// добавить метрику за выбранный день
function addMetricByDate(data, page, name, date) {
	let sampleData = data
		.filter(item => item.page == page && item.name == name && item.date == date)
		.map(item => item.value);

	let result = {};

	result.hits = sampleData.length;
	result.p25 = quantile(sampleData, 0.25);
	result.p50 = quantile(sampleData, 0.5);
	result.p75 = quantile(sampleData, 0.75);
	result.p95 = quantile(sampleData, 0.95);

	return result;
}
// рассчитывает все метрики за день
function calcMetricsByDate(data, page, date) {
	console.log(`All metrics for ${date}:`);

	let table = {};
	table.connect = addMetricByDate(data, page, 'connect', date);
	table.ttfb = addMetricByDate(data, page, 'ttfb', date);
	table.loaded = addMetricByDate(data, page, 'loaded', date);
	table.result = addMetricByDate(data, page, 'result', date);
	table.paint = addMetricByDate(data, page, 'first-contentful-paint', date);
	table.domComplete = addMetricByDate(data, page, 'domComplete', date);
	console.table(table);
};

function getTimestampFromSting(dateString) {
	const [year, month, day] = dateString.split('-');
	return new Date(year, month - 1, day);
}

fetch(`https://shri.yandex/hw/stat/data?counterId=${uuid}`)
	.then(res => res.json())
	.then(result => {
		let data = prepareData(result);
		// console.log('data: ', data);
		const dateFrom = '2021-10-29';
		const dateTo = '2021-10-30';

		calcMetricsByDate(data, 'index.html', dateTo);
		showMetricByPeriod(data, 'index.html', dateFrom, dateTo);
		showSession(data, 'index.html', '180819833397');
		compareMetric(data, 'index.html', dateFrom, dateTo);
	});