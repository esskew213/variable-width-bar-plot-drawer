import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
const body = document.querySelector('body');
const submitButton = document.body.querySelector('form input[type="submit"]');
submitButton.addEventListener('click', handleSubmit);
const fileInput = document.getElementById('dataFile');
const reader = new FileReader();
let selectedFile;

//chart dimensions
const svgWidth = 640;
const svgHeight = 400;
const marginTop = 20;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 30;

// only enable the submit button if a csv file has been uploaded
fileInput.addEventListener('change', () => {
  selectedFile = fileInput.files[0];
  console.log(selectedFile);
  if (selectedFile) {
    submitButton.removeAttribute('disabled');
  } else {
    submitButton.setAttribute('disabled', '');
  }
});

function handleSubmit(e) {
  e.preventDefault();
  reader.readAsText(selectedFile);
  reader.addEventListener('load', generateChart, false);
  reader.addEventListener('error', handleError, false);
}

function generateChart() {
  const data = parseCSV();
  drawChart(data);
}

function parseCSV() {
  const data = d3.csvParse(reader.result, d3.autoType);
  data.sort((a, b) => d3.ascending(a.height, b.height));
  console.log(data);
  return data;
}

function handleError() {
  console.log('error!!!');
}

function getBarCoordinates(data) {
  const barWidths = data.map((item) => item.width);
  const barCoordinates = [0];
  for (let i = 0; i < barWidths.length; i++) {
    barCoordinates.push(barCoordinates[i] + barWidths[i]);
  }
  return barCoordinates;
}

function drawChart(data) {
  const barCoordinates = getBarCoordinates(data);
  const xMin = barCoordinates[0];
  const xMax = barCoordinates[barCoordinates.length - 1];

  const [yMin, yMax] = d3.extent(data, (d) => d.height);

  const xScale = d3
    .scaleLinear()
    .domain([xMin, xMax])
    .range([marginLeft, svgWidth - marginRight]);

  const yScale = d3
    .scaleLinear()
    .domain([yMin, yMax])
    .range([svgHeight - marginBottom, marginTop]);

  // creating SVG
  const svg = d3
    .create('svg')
    .attr('width', svgWidth)
    .attr('height', svgHeight)
    .attr('viewBox', [0, 0, svgWidth, svgHeight])
    .attr('style', 'max-width: 100%; height: auto;');

  //x axis
  svg
    .append('g')
    .attr('transform', `translate(0,${yScale(0)})`)
    .call(d3.axisBottom(xScale).tickSizeOuter(0))
    .call((g) => g.select('.domain').remove())
    .call((g) =>
      g
        .append('text')
        .attr('x', svgWidth - marginRight)
        .attr('y', 30)
        .attr('fill', 'black')
        .attr('text-anchor', 'end')
        .text(data.columns[1])
    );

  //y axis
  svg
    .append('g')
    .attr('transform', `translate(${marginLeft},0)`)
    .call(d3.axisLeft(yScale).tickFormat((yScale) => yScale.toFixed()))
    .call((g) => g.select('.domain').remove())
    .call((g) =>
      g
        .append('text')
        .attr('x', -marginLeft)
        .attr('y', 10)
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'start')
        .text(data.columns[2])
    );

  // draw bars
  svg
    .append('g')
    .attr('fill', 'steelblue')
    .attr('fill-opacity', '20%')
    .attr('stroke', 'black')
    .attr('stroke-width', '1px')
    .selectAll()
    .data(data)
    .join('rect')
    .attr('y', (d) => {
      if (d.height < 0) {
        return yScale(0);
      } else {
        return yScale(d.height);
      }
    })
    .attr('height', (d) => {
      if (d.height < 0) {
        return yScale(d.height) - yScale(0);
      } else {
        return yScale(0) - yScale(d.height);
      }
    })
    .attr('width', (d) => xScale(d.width) - marginLeft)
    .attr('x', (d, i) => {
      return xScale(barCoordinates[i]);
    });

  body.append(svg.node());
}
