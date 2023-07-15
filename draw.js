import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
const body = document.querySelector('body');
const radioButtons = document.querySelectorAll(
  'input[type="radio"][name="dataEntry"]'
);
const textArea = document.querySelector('textarea');
const placeholderData =
  'food,unit cost, health benefit,category\nchocolate,2,-3,sugar\nbroccoli,3,5,veg\nfish,4,7.5,protein\nrice,0.5,1,carb';
const instructions = document.querySelector('#instructions');
const chartContainer = document.querySelector('#chart-container');
const submitButton = document.body.querySelector('form input[type="submit"]');
submitButton.addEventListener('click', handleSubmit);
const fileInput = document.getElementById('dataFile');

let selectedFile;

//chart dimensions
const svgWidth = 640;
const svgHeight = 400;
const marginTop = 20;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 30;

radioButtons.forEach((button) => {
  button.addEventListener('change', () => {
    if (button.value === 'uploadCSV') {
      textArea.setAttribute('style', 'display:none');
      textArea.setAttribute('disabled', '');
      fileInput.removeAttribute('disabled');
      fileInput.setAttribute('style', 'display:block');
      if (fileInput.value == '') {
        submitButton.setAttribute('disabled', '');
      }
    } else if (button.value === 'typeCSV') {
      console.log(button.value);
      textArea.removeAttribute('disabled');
      textArea.value = placeholderData;
      submitButton.removeAttribute('disabled');
      fileInput.setAttribute('disabled', '');
      fileInput.setAttribute('style', 'display:none');

      textArea.setAttribute('style', 'display:block');
    }
  });
});

textArea.addEventListener('input', () => {
  let textValue = textArea.value.trimStart();
  textArea.value = textValue;
  let submitButtonDisabled = submitButton.getAttribute('disabled');
  if (textArea.value.length > 0 && submitButtonDisabled == '') {
    submitButton.removeAttribute('disabled');
  } else if (
    textArea.value.length == 0 &&
    submitButton.getAttribute('disabled') !== ''
  ) {
    submitButton.setAttribute('disabled', '');
  }
});

// only enable the submit button if a csv file has been uploaded
fileInput.addEventListener('change', () => {
  selectedFile = fileInput.files[0];
  if (selectedFile) {
    submitButton.removeAttribute('disabled');
  } else {
    submitButton.setAttribute('disabled', '');
  }
});

function removeSVGs() {
  removeDownloadLink();
  removeTable();
  d3.selectAll('svg').remove();
}

function deleteErrorMessages() {
  const oldMessage = document.querySelectorAll('.error-message');
  if (oldMessage) {
    oldMessage.forEach((x) => x.remove());
  }
}

function printErrorMessage(node, message) {
  deleteErrorMessages();
  removeSVGs();
  console.log(message);
  let errorMessage = document.createElement('p');
  errorMessage.setAttribute('class', 'error-message');
  const errorText = document.createTextNode(message);
  errorMessage.appendChild(errorText);
  node.appendChild(errorMessage);
}

function handleSubmit(e) {
  e.preventDefault();
  deleteErrorMessages();
  removeSVGs();
  const reader = new FileReader();
  if (fileInput.getAttribute('disabled') !== '') {
    console.log(selectedFile);
    reader.readAsText(selectedFile);
    reader.addEventListener('load', () => generateChart(reader.result), false);
  } else {
    generateChart(textArea.value);
  }
}

function generateChart(readerResult) {
  console.log(readerResult);
  const data = parseCSV(readerResult);
  drawChart(data);
  generateDataTable(data);
}

function parseCSV(readerResult) {
  try {
    const data = d3.csvParse(readerResult, d3.autoType);
    if (data.columns.length !== 4) {
      throw new Error(
        'Please make sure you have four columns and a header row.'
      );
    }
    data.sort((a, b) => d3.ascending(a[data.columns[2]], b[data.columns[2]]));
    const legendList = [];

    for (let numRows = 0; numRows < data.length; numRows++) {
      for (let numCols = 1; numCols <= 2; numCols++) {
        console.log(data[numRows][data.columns[numCols]]);
        if (typeof data[numRows][data.columns[numCols]] !== 'number') {
          throw new Error('Widths and heights must be numbers!');
        }
        if (numCols == 1 && data[numRows][data.columns[numCols]] <= 0) {
          throw new Error('Width must be a positive number!');
        }
      }
      if (!legendList.includes(data[numRows][data.columns[3]])) {
        legendList.push(data[numRows][data.columns[3]]);
      }
      if (legendList.length > 10) {
        throw new Error('Too many categories! Please use a maximum of 10.');
      }
    }
    return data;
  } catch (e) {
    printErrorMessage(instructions, e);
  }
}

function getBarCoordinates(data) {
  const barWidths = data.map((item) => item[data.columns[1]]);
  const barCoordinates = [0];
  for (let i = 0; i < barWidths.length; i++) {
    barCoordinates.push(barCoordinates[i] + barWidths[i]);
  }
  return barCoordinates;
}

function getColourScale(data) {
  const LEGENDCOLOURS = [
    '#F77F00',
    '#D62828',
    '#FCBF49',
    '#EAE2B7',
    '#003049',
    '#588157',
    '#38A3A5',
    '#6D597A',
    '#F07167',
    '#DDA15E',
  ];

  const UNKNOWNCOLOUR = '#8B8C89';
  const colourScale = d3
    .scaleOrdinal()
    .domain(data.map((d) => d[data.columns[3]]))
    .range(LEGENDCOLOURS)
    .unknown(UNKNOWNCOLOUR);
  return colourScale;
}
function drawChart(data) {
  const barCoordinates = getBarCoordinates(data);
  const [
    namesColumnName,
    widthColumnName,
    heightsColumnName,
    legendColumnName,
  ] = data.columns;
  const xMin = barCoordinates[0];
  const xMax = barCoordinates[barCoordinates.length - 1];
  const [yMin, yMax] = d3.extent(data, (d) => d[heightsColumnName]);

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

  // draw bars
  const colourScale = getColourScale(data);

  svg
    .append('g')
    .attr('fill-opacity', '80%')
    .attr('stroke', 'black')
    .attr('stroke-width', '1px')
    .selectAll()
    .data(data)
    .join('rect')
    .attr('fill', (d) => colourScale(d[legendColumnName]))
    .attr('y', (d) => {
      if (d[heightsColumnName] < 0) {
        return yScale(0);
      } else {
        return yScale(d[heightsColumnName]);
      }
    })
    .attr('height', (d) => {
      if (d[heightsColumnName] < 0) {
        return yScale(d[heightsColumnName]) - yScale(0);
      } else {
        return yScale(0) - yScale(d[heightsColumnName]);
      }
    })
    .attr('width', (d) => xScale(d[widthColumnName]) - marginLeft)
    .attr('x', (d, i) => {
      return xScale(barCoordinates[i]);
    });

  svg
    .selectAll('text')
    .data(data)
    .enter()
    .append('text')
    .attr('font-size', '0.8em')
    .attr('text-anchor', 'middle')
    .attr('font-weight', 'bold')
    .attr('x', (d, i) => {
      return xScale((barCoordinates[i] + barCoordinates[i + 1]) / 2);
    })
    .attr('y', (d) => {
      if (d[heightsColumnName] < 0) {
        return yScale(d[heightsColumnName]) + 15;
      } else {
        return yScale(d[heightsColumnName]) - 5;
      }
    })
    .text((d, i) => i + 1);
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
        .attr('y', 40)
        .attr('fill', 'black')
        .attr('text-anchor', 'end')
        .attr('font-size', '1.5em')
        .text(widthColumnName)
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
        .attr('font-size', '1.5em')
        .text(heightsColumnName)
    );

  chartContainer.append(svg.node());

  createDownloadLink();
}

function createDownloadLink() {
  removeDownloadLink();
  const svgData = document.querySelector('svg').outerHTML;
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  const downloadLink = document.createElement('a');
  downloadLink.setAttribute('id', 'download-link');
  downloadLink.setAttribute('href', svgUrl);
  downloadLink.setAttribute('download', 'bar-chart.svg');
  const linkText = document.createTextNode('Download your svg here');
  downloadLink.appendChild(linkText);
  chartContainer.prepend(downloadLink);
}

function removeDownloadLink() {
  const oldLink = document.querySelector('#download-link');
  if (oldLink) {
    oldLink.remove();
  }
}
function removeTable() {
  const oldTable = document.querySelector('#data-table');
  if (oldTable) {
    oldTable.remove();
  }
}
function generateDataTable(data) {
  removeTable();
  const colourScale = getColourScale(data);
  const dataTable = d3.select('#chart-container').append('table');
  const columns = ['S/N', ...data.columns];
  let counter = 0;
  let legendColourCounter = 0;
  dataTable.attr('id', 'data-table');
  const thead = dataTable.append('thead');
  const tbody = dataTable.append('tbody');
  thead
    .append('tr')
    .selectAll('th')
    .data(columns)
    .enter()
    .append('th')
    .text((d) => d);

  tbody
    .selectAll('tr')
    .data(data)
    .enter()
    .append('tr')
    // .attr('bgcolor', (d) => colourScale(d[data.columns[3]]))
    .selectAll('td')
    .data((row) => {
      return columns.map((header) => {
        if (header === 'S/N') {
          counter++;
          return counter;
        } else {
          return row[header];
        }
      });
    })
    .enter()
    .append('td')
    .attr('bgcolor', (d) => {
      legendColourCounter++;
      return legendColourCounter % 5 === 0 ? colourScale(d) : 'white';
    })
    .text((d) => {
      return d;
    });
}
