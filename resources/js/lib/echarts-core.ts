import { EffectScatterChart, SankeyChart, ScatterChart } from 'echarts/charts';
import { CalendarComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

/**
 * Tree-shaken ECharts instance. Only the chart types and components actually
 * used by the dashboard widgets are registered, so the `echarts` bundle ships
 * the modules we render instead of the entire (~1.1 MB) library.
 */
echarts.use([
    SankeyChart,
    ScatterChart,
    EffectScatterChart,
    TooltipComponent,
    VisualMapComponent,
    CalendarComponent,
    CanvasRenderer,
]);

export default echarts;
