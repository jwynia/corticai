# WEB-006: Dashboard Layout and Widget System

## Metadata
- **Status:** planned
- **Type:** feature
- **Epic:** web-dashboard
- **Priority:** medium
- **Size:** large
- **Created:** 2025-09-26
- **Branch:** [not yet created]

## Description
Build a flexible dashboard system with drag-and-drop widget layout, real-time data visualization, and user customization. This implements the dashboard functionality following the form-driven pattern where dashboard configuration is stored as form submissions.

## Acceptance Criteria
- [ ] Create responsive grid-based dashboard layout system
- [ ] Implement drag-and-drop widget positioning and resizing
- [ ] Build widget library with different visualization types
- [ ] Add real-time data updates via WebSocket integration
- [ ] Support dashboard templates and presets
- [ ] Implement widget configuration through forms
- [ ] Add dashboard sharing and export capabilities
- [ ] Support multiple dashboard views per user
- [ ] Implement widget filtering and drill-down capabilities
- [ ] Add responsive design for mobile dashboards
- [ ] Support dashboard theming and customization
- [ ] Implement widget refresh controls and scheduling

## Technical Notes
- Use React Grid Layout for drag-and-drop grid system
- Implement widget system using form-driven configuration
- Use Chart.js or Recharts for data visualizations
- WebSocket integration for real-time updates
- Store dashboard layouts as form submissions per architecture patterns

## Dependencies
- WEB-004: Dynamic Form Renderer Engine
- WEB-003: API Client Integration and State Management
- WEB-002: Design System and Component Library

## Dashboard Architecture
```typescript
interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  widgets: Widget[];
  settings: DashboardSettings;
  isDefault?: boolean;
  isShared?: boolean;
}

interface DashboardLayout {
  type: 'grid' | 'free-form';
  columns: number;
  rowHeight: number;
  margin: [number, number];
  containerPadding: [number, number];
  responsive: boolean;
  breakpoints: Record<string, number>;
}

interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  position: GridPosition;
  config: WidgetConfig;
  dataSource: DataSourceConfig;
  refreshInterval?: number;
  filters?: FilterConfig[];
}

type WidgetType =
  | 'chart' | 'table' | 'metric' | 'list'
  | 'progress' | 'gauge' | 'map'
  | 'calendar' | 'timeline' | 'kanban';

interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}
```

## Dashboard Layout Component
```typescript
import { Responsive, WidthProvider } from 'react-grid-layout';

const ResponsiveGridLayout = WidthProvider(Responsive);

const DashboardLayout = ({
  dashboard,
  isEditMode,
  onLayoutChange,
  onWidgetUpdate
}: {
  dashboard: Dashboard;
  isEditMode: boolean;
  onLayoutChange: (layout: Layout[]) => void;
  onWidgetUpdate: (widgetId: string, updates: Partial<Widget>) => void;
}) => {
  const layouts = generateLayouts(dashboard.widgets);

  return (
    <div className="dashboard-container">
      <DashboardHeader
        dashboard={dashboard}
        isEditMode={isEditMode}
        onToggleEdit={() => setEditMode(!isEditMode)}
      />

      <ResponsiveGridLayout
        className="dashboard-grid"
        layouts={layouts}
        onLayoutChange={onLayoutChange}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        margin={dashboard.layout.margin}
        containerPadding={dashboard.layout.containerPadding}
        rowHeight={dashboard.layout.rowHeight}
        breakpoints={dashboard.layout.breakpoints}
        cols={{
          lg: dashboard.layout.columns,
          md: Math.floor(dashboard.layout.columns * 0.75),
          sm: Math.floor(dashboard.layout.columns * 0.5),
          xs: 1
        }}
      >
        {dashboard.widgets.map(widget => (
          <div key={widget.id} className="widget-container">
            <WidgetWrapper
              widget={widget}
              isEditMode={isEditMode}
              onUpdate={(updates) => onWidgetUpdate(widget.id, updates)}
              onDelete={() => deleteWidget(widget.id)}
              onConfigure={() => openWidgetConfig(widget)}
            />
          </div>
        ))}
      </ResponsiveGridLayout>

      {isEditMode && <WidgetPalette onAddWidget={addWidget} />}
    </div>
  );
};
```

## Widget Wrapper Component
```typescript
const WidgetWrapper = ({
  widget,
  isEditMode,
  onUpdate,
  onDelete,
  onConfigure
}: {
  widget: Widget;
  isEditMode: boolean;
  onUpdate: (updates: Partial<Widget>) => void;
  onDelete: () => void;
  onConfigure: () => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState<string | null>(null);

  // Real-time data subscription
  useEffect(() => {
    const subscription = subscribeToWidget(widget.id, (newData) => {
      setData(newData);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [widget.id]);

  return (
    <Card className="widget-card">
      <CardHeader className="widget-header">
        <div className="widget-title-section">
          <CardTitle>{widget.title}</CardTitle>
          {isLoading && <Spinner size="sm" />}
        </div>

        {isEditMode && (
          <div className="widget-actions">
            <Button
              size="sm"
              variant="ghost"
              onClick={onConfigure}
              title="Configure widget"
            >
              <Settings size={16} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refreshWidget(widget.id)}
              title="Refresh widget"
            >
              <RefreshCw size={16} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              title="Delete widget"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="widget-content">
        {error ? (
          <WidgetError error={error} onRetry={() => refreshWidget(widget.id)} />
        ) : (
          <WidgetRenderer
            widget={widget}
            data={data}
            isLoading={isLoading}
          />
        )}
      </CardContent>
    </Card>
  );
};
```

## Widget Renderer System
```typescript
const WidgetRenderer = ({
  widget,
  data,
  isLoading
}: {
  widget: Widget;
  data: any;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return <WidgetSkeleton type={widget.type} />;
  }

  switch (widget.type) {
    case 'chart':
      return <ChartWidget widget={widget} data={data} />;
    case 'table':
      return <TableWidget widget={widget} data={data} />;
    case 'metric':
      return <MetricWidget widget={widget} data={data} />;
    case 'list':
      return <ListWidget widget={widget} data={data} />;
    case 'progress':
      return <ProgressWidget widget={widget} data={data} />;
    case 'gauge':
      return <GaugeWidget widget={widget} data={data} />;
    case 'map':
      return <MapWidget widget={widget} data={data} />;
    case 'calendar':
      return <CalendarWidget widget={widget} data={data} />;
    case 'timeline':
      return <TimelineWidget widget={widget} data={data} />;
    case 'kanban':
      return <KanbanWidget widget={widget} data={data} />;
    default:
      return <UnknownWidget widget={widget} />;
  }
};
```

## Chart Widget Implementation
```typescript
import {
  LineChart,
  BarChart,
  PieChart,
  AreaChart,
  ScatterChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const ChartWidget = ({ widget, data }: { widget: Widget; data: any }) => {
  const config = widget.config as ChartConfig;

  const ChartComponent = getChartComponent(config.chartType);

  return (
    <div className="chart-widget">
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={config.xAxis}
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            content={<CustomTooltip />}
            labelStyle={{ color: 'var(--color-foreground)' }}
          />
          {config.showLegend && <Legend />}

          {config.series.map((series, index) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              fill={series.color || getDefaultColor(index)}
              name={series.label}
            />
          ))}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
};

interface ChartConfig {
  chartType: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  xAxis: string;
  yAxis?: string;
  series: ChartSeries[];
  showLegend: boolean;
  showGrid: boolean;
  colors?: string[];
}

interface ChartSeries {
  key: string;
  label: string;
  color?: string;
  type?: 'line' | 'bar' | 'area';
}
```

## Metric Widget Implementation
```typescript
const MetricWidget = ({ widget, data }: { widget: Widget; data: any }) => {
  const config = widget.config as MetricConfig;
  const value = extractValue(data, config.valueField);
  const previousValue = extractValue(data, config.previousValueField);

  const change = previousValue ? calculateChange(value, previousValue) : null;
  const trend = change ? (change > 0 ? 'up' : change < 0 ? 'down' : 'stable') : null;

  return (
    <div className="metric-widget">
      <div className="metric-main">
        <div className="metric-value">
          {formatValue(value, config.format)}
        </div>
        <div className="metric-label">
          {config.label}
        </div>
      </div>

      {change !== null && (
        <div className={`metric-change ${trend}`}>
          <TrendIcon trend={trend} />
          <span>{formatChange(change, config.format)}</span>
          <span className="change-period">vs {config.comparisonPeriod}</span>
        </div>
      )}

      {config.showSparkline && data.sparklineData && (
        <div className="metric-sparkline">
          <Sparkline
            data={data.sparklineData}
            color={getSparklineColor(trend)}
          />
        </div>
      )}
    </div>
  );
};

interface MetricConfig {
  valueField: string;
  previousValueField?: string;
  label: string;
  format: 'number' | 'currency' | 'percentage' | 'duration';
  comparisonPeriod?: string;
  showSparkline: boolean;
  target?: number;
  thresholds?: {
    good: number;
    warning: number;
    critical: number;
  };
}
```

## Widget Configuration System
```typescript
const WidgetConfigModal = ({
  widget,
  isOpen,
  onClose,
  onSave
}: {
  widget: Widget;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: WidgetConfig) => void;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Configure {widget.title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="widget-config-tabs">
          <TabsList>
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="data">Data Source</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="filters">Filters</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <BasicWidgetConfig widget={widget} />
          </TabsContent>

          <TabsContent value="data">
            <DataSourceConfig widget={widget} />
          </TabsContent>

          <TabsContent value="appearance">
            <AppearanceConfig widget={widget} />
          </TabsContent>

          <TabsContent value="filters">
            <FilterConfig widget={widget} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(getWidgetConfig())}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

## Data Source Configuration
```typescript
const DataSourceConfig = ({ widget }: { widget: Widget }) => {
  const [dataSource, setDataSource] = useState(widget.dataSource);

  return (
    <div className="data-source-config">
      <FormField>
        <Label>Data Source Type</Label>
        <Select
          value={dataSource.type}
          onValueChange={(value) =>
            setDataSource({ ...dataSource, type: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="form-submissions">Form Submissions</SelectItem>
            <SelectItem value="api-endpoint">API Endpoint</SelectItem>
            <SelectItem value="sql-query">SQL Query</SelectItem>
            <SelectItem value="analytics">Analytics Data</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {dataSource.type === 'form-submissions' && (
        <FormSubmissionDataSource
          config={dataSource.config}
          onChange={(config) =>
            setDataSource({ ...dataSource, config })
          }
        />
      )}

      {dataSource.type === 'api-endpoint' && (
        <ApiEndpointDataSource
          config={dataSource.config}
          onChange={(config) =>
            setDataSource({ ...dataSource, config })
          }
        />
      )}

      <FormField>
        <Label>Refresh Interval</Label>
        <Select
          value={dataSource.refreshInterval?.toString()}
          onValueChange={(value) =>
            setDataSource({
              ...dataSource,
              refreshInterval: parseInt(value)
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Manual only</SelectItem>
            <SelectItem value="30">30 seconds</SelectItem>
            <SelectItem value="60">1 minute</SelectItem>
            <SelectItem value="300">5 minutes</SelectItem>
            <SelectItem value="900">15 minutes</SelectItem>
            <SelectItem value="3600">1 hour</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
    </div>
  );
};
```

## Real-time Updates System
```typescript
const useWidgetData = (widget: Widget) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial data fetch
  useEffect(() => {
    fetchWidgetData(widget)
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [widget.id, widget.dataSource]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!widget.dataSource.realTime) return;

    const ws = new WebSocket(`/api/widgets/${widget.id}/subscribe`);

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);

      switch (update.type) {
        case 'data-update':
          setData(update.data);
          break;
        case 'partial-update':
          setData(prev => mergeData(prev, update.data));
          break;
        case 'error':
          setError(update.message);
          break;
      }
    };

    return () => ws.close();
  }, [widget.id, widget.dataSource.realTime]);

  // Periodic refresh
  useEffect(() => {
    if (!widget.refreshInterval) return;

    const interval = setInterval(() => {
      fetchWidgetData(widget)
        .then(setData)
        .catch(setError);
    }, widget.refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [widget.refreshInterval]);

  return { data, isLoading, error, refetch: () => fetchWidgetData(widget) };
};
```

## Dashboard Templates System
```typescript
interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail?: string;
  dashboard: Omit<Dashboard, 'id'>;
}

const DashboardTemplateLibrary = () => {
  const { data: templates } = useQuery({
    queryKey: ['dashboard-templates'],
    queryFn: () => apiClient.dashboards.getTemplates()
  });

  return (
    <Dialog>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Choose a Dashboard Template</DialogTitle>
        </DialogHeader>

        <div className="template-browser">
          <div className="template-categories">
            {getUniqueCategories(templates).map(category => (
              <Button
                key={category}
                variant="outline"
                className="category-filter"
                onClick={() => filterByCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          <div className="template-grid">
            {templates?.map(template => (
              <DashboardTemplateCard
                key={template.id}
                template={template}
                onSelect={() => createFromTemplate(template)}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

## Performance Optimizations
- Virtualize large dashboard grids
- Implement widget lazy loading
- Use React.memo for widget components
- Debounce layout changes
- Optimize chart rendering with canvas fallbacks

## Accessibility Features
- Keyboard navigation for dashboard editing
- Screen reader support for data visualizations
- High contrast mode for charts
- Alternative text for visual data
- Focus management for modal dialogs

## Testing Strategy
- Unit tests for widget components
- Integration tests for dashboard functionality
- Performance tests with many widgets
- Accessibility tests for screen readers
- Visual regression tests for chart rendering

## References
- React Grid Layout: https://github.com/react-grid-layout/react-grid-layout
- Recharts: https://recharts.org/
- Chart.js: https://www.chartjs.org/
- Dashboard UX best practices
- Data visualization accessibility guidelines

## Branch Naming
`feat/WEB-006-dashboard-widget-system`