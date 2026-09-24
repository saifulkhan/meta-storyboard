import * as d3 from 'd3';
import { ActionName } from '../../types/ActionName';
import { Action, defaultActionProps } from './Action';
import { Coordinate, TextBoxProps } from '../../types';
import { logger } from '../../logger';

export const defaultTextBoxProps: TextBoxProps = {
  ...defaultActionProps,
  title: '...',
  message: '...',
  backgroundColor: '#F8F8F8',
  width: 300,
  showConnector: false,
  horizontalAlign: 'center',
  verticalAlign: 'middle',
  padding: 3,
  fontFamily: 'Arial Narrow',
  fontSize: '12px',
  templateVariables: {},
};

export class TextBox extends Action {
  protected props: TextBoxProps = defaultTextBoxProps;
  protected rectNode: any;
  protected titleNode: any;
  protected messageNode: any;
  protected textNode: any;
  protected connectorNode: any;
  protected spaceWidth: number = 0;

  constructor() {
    super();
    this.type = ActionName.TEXT_BOX;
  }

  public setProps(props: Partial<TextBoxProps>) {
    this.props = { ...defaultTextBoxProps, ...props };
    // update template variables
    this.props.templateVariables = {
      ...defaultTextBoxProps.templateVariables,
      ...props.templateVariables,
    };

    if (this.props.templateVariables) {
      // update message
      this.props.message = this.updateStringTemplate(
        this.props.message,
        this.props.templateVariables,
      );

      // update title
      this.props.title = this.updateStringTemplate(
        this.props.title,
        this.props.templateVariables,
      );
    }
    return this;
  }

  public updateProps(props: Partial<TextBoxProps>) {
    this.props = { ...this.props, ...props };
    // update template variables
    this.props.templateVariables = {
      ...defaultTextBoxProps.templateVariables,
      ...props.templateVariables,
    };

    // prettier-ignore
    logger.debug('TextBox:updateProps: props: ', props, '\nthis.props:', this.props);
    if (this.props.templateVariables) {
      this.props.message = this.updateStringTemplate(
        this.props.message,
        this.props.templateVariables,
      );
      this.props.title = this.updateStringTemplate(
        this.props.title,
        this.props.templateVariables,
      );
    }
    // prettier-ignore
    logger.debug('TextBox:updateProps: ', this.props.message, this.props.title);
    return this;
  }

  public setCanvas(svg: SVGGElement) {
    this.svg = svg;
    this.canvas();
    this.draw();
    return this;
  }

  public draw() {
    this.rectNode = d3
      .create('svg')
      .append('rect')
      .attr('fill', this.props.backgroundColor!)
      .attr('width', this.props.width!)
      .attr('rx', 3)
      .node();
    this.node!.appendChild(this.rectNode);

    this.titleNode = d3
      .create('svg')
      .append('text')
      .attr('font-size', this.props.fontSize)
      .attr('font-family', this.props.fontFamily)
      .attr('fill', 'black')
      .attr('font-weight', 'bold')
      .node();

    this.messageNode = d3
      .create('svg')
      .append('text')
      .attr('font-size', this.props.fontSize)
      .attr('font-family', this.props.fontFamily)
      .attr('fill', 'black')
      .node();

    this.textNode = d3
      .create('svg')
      .append('g')
      .attr('fill', this.props.backgroundColor!)
      .node();

    this.connectorNode = d3
      .create('svg')
      .append('line')
      .attr('stroke', '#808080')
      .attr('opacity', 1)
      .style('stroke-dasharray', '3,3')
      .node();

    this.textNode.append(this.titleNode);
    this.textNode.append(this.messageNode);
    this.node!.appendChild(this.textNode);
    this.node!.appendChild(this.connectorNode);

    // wrap title and message
    this.wrap(this.titleNode, this.props.title!);
    this.wrap(this.messageNode, this.props.message!);

    // y position of message, give some space after title
    let height = this.titleNode.getBoundingClientRect().height;
    this.messageNode.setAttribute('y', `${height + this.props.padding}px`);

    // y position of rect
    height = this.textNode.getBoundingClientRect().height;
    this.rectNode.setAttribute('height', `${height + this.props.padding}px`);

    return this;
  }

  /*
   * In SVG, text is rendered in a single line. To wrap text, we use individual
   * <tspan> elements for each row.
   */
  private wrap(element: SVGTextElement, text: string) {
    const words: string[] = text.split(' ');
    // console.log("TextBox:_wrap words =", words);

    const calculateTextWidth = (
      element: SVGTextElement,
      word: string,
    ): number => {
      const wordElem = element.appendChild(
        d3.create('svg').append('tspan').text(word).node() as SVGTSpanElement,
      ) as SVGTSpanElement;

      // console.log("TextBox:_wrap wordElem =", wordElem);
      // wordElem = <tspan>​{DATE},​</tspan>​

      const { width } = wordElem.getBoundingClientRect();
      element.removeChild(wordElem);
      return width;
    };

    const addText = (element: SVGTextElement, words: string[]) => {
      element.appendChild(
        d3
          .create('svg')
          .append('tspan')
          .attr('x', 0)
          .attr('dy', '1.1em')
          .text(words.join(' ') + ' ')
          .node() as SVGTSpanElement,
      );
    };

    // Draw each word onto svg and save its width before removing
    const wordWidthArr: { word: string; width: number }[] = words.map(
      (word) => {
        return { word: word, width: calculateTextWidth(element, word) };
      },
    );
    // console.log("TextBox:_wrap wordWidthArr =", wordWidthArr);

    // calculate the width of the backspace text
    this.spaceWidth = calculateTextWidth(element, '-');
    // console.log("TextBox:_wrap _spaceWidth = ", this._spaceWidth);

    // keep adding words to row until width exceeds span then create new row
    let accumulatedWidth = 0;
    let wordsInLine: string[] = [];
    const messageWidth = this.props.width! - this.props.padding;

    for (let i = 0; i < wordWidthArr.length; i++) {
      const word = wordWidthArr[i].word,
        width = wordWidthArr[i].width + this.spaceWidth;

      if (accumulatedWidth + width < messageWidth) {
        // prettier-ignore
        // console.log("TextBox:_wrap wordsInLine = ", wordsInLine, ", accumulatedWidth + width = ", accumulatedWidth + width, "this._messageWidth = ", this._messageWidth)
        // keep adding words to be displayed in a line
        accumulatedWidth += width;
        wordsInLine.push(word);
      } else {
        // create a line
        addText(element, wordsInLine);

        // prepare for new line
        accumulatedWidth = width;
        wordsInLine = [word];
      }

      // last word
      if (i === wordWidthArr.length - 1) {
        addText(element, wordsInLine);
      }
    }
  }

  public setCoordinate(coordinate: [Coordinate, Coordinate]): this {
    this.coordOrigin = coordinate[0];
    this.coordDestination = coordinate[1];

    const [x1, y1] = coordinate[0];
    const [x2, y2] = coordinate[1];

    const { width, height } = this.rectNode.getBoundingClientRect();
    let x = 0,
      y = 0;

    if (this.props.horizontalAlign === 'left') {
      x = x2 - width;
    } else if (this.props.horizontalAlign === 'center') {
      x = x2 - width / 2;
    } else if (this.props.horizontalAlign === 'right') {
      x = x2;
    }

    if (this.props.verticalAlign === 'top') {
      y = y2 - height;
    } else if (this.props.verticalAlign === 'middle') {
      y = y2 - height / 2;
    } else if (this.props.verticalAlign === 'bottom') {
      y = y2 + height;
    }

    d3.select(this.rectNode).attr('transform', `translate(${x},${y})`);
    d3.select(this.textNode).attr(
      'transform',
      `translate(${x + this.props.padding},${y})`,
    );

    // align texts
    this.correctTextAlignment(this.titleNode, width, 'center');
    this.correctTextAlignment(this.messageNode, width);

    // connector
    if (this.props.showConnector) {
      d3.select(this.connectorNode)
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2);
    }

    return this;
  }

  public move(
    coordinate: Coordinate,
    delay = 500,
    duration = 1500,
  ): Promise<any> {
    this.coordDestination = coordinate;
    logger.debug(
      'TextBox:move: coordinate1:',
      coordinate,
      this.coordDestination,
    );

    const { width, height } = this.rectNode.getBoundingClientRect();

    // left align
    // const x = dest[0] - width;
    // center aligned
    // const x = dest[0] - width / 2;

    // right align
    const x = this.coordDestination[0];
    const y = this.coordDestination[1] - height;

    const promise1 = new Promise<number>((resolve, reject) => {
      d3.select(this.rectNode)
        .transition()
        .ease(d3.easeQuadIn)
        .duration(duration)
        .attr('transform', `translate(${x},${y})`)
        .on('end', () => {
          resolve(delay + duration);
        });
    });

    const promise2 = new Promise<number>((resolve, reject) => {
      d3.select(this.textNode)
        .transition()
        .ease(d3.easeQuadIn)
        .duration(duration)
        .attr('transform', `translate(${x + this.props.padding},${y})`)
        .on('end', () => {
          resolve(delay + duration);
        });
    });

    // align texts
    this.correctTextAlignment(this.titleNode, width, 'center');
    this.correctTextAlignment(this.messageNode, width);

    return Promise.all([promise1, promise2]);
  }

  private correctTextAlignment(
    textElem: SVGTextElement,
    width: number,
    align: string = 'left',
  ) {
    const alignToX = () => {
      // uses the width and alignment of text to calculate correct x values of
      // tspan elements
      return (width / 2) * (align == 'center' ? 1 : align == 'right' ? 2 : 0);
    };

    // aligns tspan elements based on chosen alignment
    Array.from(textElem.children).forEach((tspan: any) =>
      tspan.setAttribute('x', alignToX()),
    );
  }

  /**
   ** Define a function to replace variables in a string template
   **
   ** Example:
   ** const template = "Hello, ${name}! You are ${age} years old.";
   ** const variables = { name: "John Doe", age: 30 };
   ** const result = updateStringTemplate(templateString, variables);
   ** console.log(result); // Output: "Hello, John Doe! You are 30 years old."
   **/

  private updateStringTemplate(template: string, object: any): string {
    const variableRegex = /\${(\w+)}/g;

    return template.replace(variableRegex, (match, variableName, offset) => {
      let variableValue = object[variableName];

      // fallback: if "value" not found, try "y" (for time series data)
      if (
        (variableName === 'value' || variableName === 'y') &&
        variableValue === undefined
      ) {
        variableValue = object[variableName === 'value' ? 'y' : 'value'];
      }

      if (variableValue === undefined) {
        return match;
      }

      // date formatting
      if (variableValue instanceof Date) {
        return variableValue.toLocaleDateString('en-GB');
      }

      // percentage formatting: check if the next character in the template is '%'
      const nextChar = template[offset + match.length];
      if (nextChar === '%' && typeof variableValue === 'number') {
        return (variableValue * 100).toFixed(2);
      }

      return variableValue.toString();
    });
  }
}
