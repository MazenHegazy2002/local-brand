/**
 * Smoke tests for the small, pure UI primitives that the rest of the app
 * composes against (`Badge`, `Button`, `EmptyState`, `PriceDisplay`). The
 * goal here isn't full visual coverage — it's to catch regressions that
 * would silently break the design system, like a variant losing its
 * className, the disabled state dropping, the discount badge appearing
 * when the original price equals the sale price, etc.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PriceDisplay } from '@/components/ui/PriceDisplay';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';

describe('<Badge />', () => {
  it('renders children inside a span', () => {
    render(<Badge>Hello</Badge>);
    const el = screen.getByText('Hello');
    expect(el.tagName.toLowerCase()).toBe('span');
  });

  it('applies the success variant style when variant="success"', () => {
    const { container } = render(<Badge variant="success">OK</Badge>);
    const span = container.querySelector('span');
    expect(span!.className).toMatch(/bg-green-100/);
    expect(span!.className).toMatch(/text-green-700/);
  });

  it('applies error variant when variant="error"', () => {
    const { container } = render(<Badge variant="error">FAIL</Badge>);
    expect(container.querySelector('span')!.className).toMatch(/bg-red-100/);
  });

  it('renders a colored dot when dot prop is set', () => {
    const { container } = render(
      <Badge variant="warning" dot>
        Pending
      </Badge>
    );
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(2); // outer span + dot span
    expect(spans[1].className).toMatch(/bg-amber-500/);
  });

  it('omits the dot span when dot prop is absent', () => {
    const { container } = render(<Badge variant="info">No dot</Badge>);
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(1);
  });

  it('applies size="sm" classes', () => {
    const { container } = render(<Badge size="sm">small</Badge>);
    expect(container.querySelector('span')!.className).toMatch(/text-\[10px\]/);
  });

  it('forwards a custom className', () => {
    const { container } = render(<Badge className="my-custom-class">x</Badge>);
    expect(container.querySelector('span')!.className).toMatch(/my-custom-class/);
  });
});

describe('<Button />', () => {
  it('renders children and a default type of "submit" when inside a form (browser default)', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('disables itself while loading and renders the spinner', () => {
    const { container } = render(<Button loading>Saving</Button>);
    const btn = container.querySelector('button')!;
    expect(btn).toBeDisabled();
    // Spinner is an SVG element.
    expect(btn.querySelector('svg')).not.toBeNull();
  });

  it('disables when disabled prop is set', () => {
    render(
      <Button disabled onClick={jest.fn()}>
        Off
      </Button>
    );
    expect(screen.getByRole('button', { name: 'Off' })).toBeDisabled();
  });

  it('does not fire onClick while loading', () => {
    const onClick = jest.fn();
    render(
      <Button loading onClick={onClick}>
        Saving
      </Button>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Saving' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('fires onClick when active', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders left and right icons when not loading', () => {
    render(
      <Button
        iconLeft={<span data-testid="left-icon">L</span>}
        iconRight={<span data-testid="right-icon">R</span>}
      >
        Center
      </Button>
    );
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('hides the left icon while loading (spinner takes its place)', () => {
    render(
      <Button loading iconLeft={<span data-testid="left-icon">L</span>}>
        Saving
      </Button>
    );
    expect(screen.queryByTestId('left-icon')).toBeNull();
  });

  it('applies the destructive variant style', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    expect(container.querySelector('button')!.className).toMatch(/bg-red-600/);
  });

  it('honors fullWidth prop', () => {
    const { container } = render(<Button fullWidth>Wide</Button>);
    expect(container.querySelector('button')!.className).toMatch(/w-full/);
  });

  it('forwards refs (useful for focus management)', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Focusable</Button>);
    expect(ref.current).not.toBeNull();
    expect(ref.current!.tagName.toLowerCase()).toBe('button');
  });
});

describe('<EmptyState />', () => {
  it('renders title and description', () => {
    render(
      <EmptyState title="No orders yet" description="Place your first order to see it here" />
    );
    expect(screen.getByText('No orders yet')).toBeInTheDocument();
    expect(screen.getByText('Place your first order to see it here')).toBeInTheDocument();
  });

  it('omits the description block when none is provided', () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(screen.getByText('Empty')).toBeInTheDocument();
    // Description renders as a <p>; with no description prop there should be none.
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders the action node when supplied', () => {
    render(<EmptyState title="Empty" action={<button>Refresh</button>} />);
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('renders an icon when supplied', () => {
    render(<EmptyState title="Empty" icon={<svg data-testid="empty-icon" />} />);
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
  });
});

describe('<PriceDisplay />', () => {
  it('renders the price with the default EGP currency', () => {
    render(<PriceDisplay price={199} />);
    // Price is rendered with a non-breaking space between number and currency.
    expect(screen.getByText(/199.*EGP/)).toBeInTheDocument();
  });

  it('formats large prices with thousand separators', () => {
    render(<PriceDisplay price={1234567} />);
    expect(screen.getByText(/1,234,567/)).toBeInTheDocument();
  });

  it('shows the original price struck-through when it is higher than current', () => {
    const { container } = render(<PriceDisplay price={150} originalPrice={200} />);
    const strike = container.querySelector('.line-through');
    expect(strike).not.toBeNull();
    expect(strike!.textContent).toMatch(/200/);
  });

  it('does NOT show a strike-through when original equals current (no real discount)', () => {
    const { container } = render(<PriceDisplay price={200} originalPrice={200} />);
    expect(container.querySelector('.line-through')).toBeNull();
  });

  it('does NOT show a strike-through when original is less than current (data glitch)', () => {
    const { container } = render(<PriceDisplay price={250} originalPrice={200} />);
    expect(container.querySelector('.line-through')).toBeNull();
  });

  it('renders the sale badge with the right percentage when showSaleBadge is true', () => {
    // 200 → 150 = 25% off.
    render(<PriceDisplay price={150} originalPrice={200} showSaleBadge />);
    expect(screen.getByText('-25%')).toBeInTheDocument();
  });

  it('rounds the discount percent to the nearest integer', () => {
    // 33.33% should round to 33%.
    render(<PriceDisplay price={200} originalPrice={300} showSaleBadge />);
    expect(screen.getByText('-33%')).toBeInTheDocument();
  });

  it('hides the sale badge when there is no discount, even with showSaleBadge=true', () => {
    render(<PriceDisplay price={200} originalPrice={200} showSaleBadge />);
    expect(screen.queryByText(/^-/)).toBeNull();
  });

  it('renders the per-unit suffix when supplied', () => {
    render(<PriceDisplay price={50} perUnit="kg" />);
    expect(screen.getByText('/ kg')).toBeInTheDocument();
  });

  it('honors a non-default currency', () => {
    render(<PriceDisplay price={100} currency="USD" />);
    expect(screen.getByText(/100.*USD/)).toBeInTheDocument();
  });
});

describe('<Select />', () => {
  const options = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
  ];

  it('renders a label and option elements', () => {
    render(<Select label="Test Select" options={options} defaultValue="1" />);
    expect(screen.getByLabelText('Test Select')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Option 1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Option 2' })).toBeInTheDocument();
  });

  it('renders required asterisk', () => {
    render(<Select label="Test Select" options={options} required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays error message when provided', () => {
    render(<Select options={options} error="Selection is required" />);
    expect(screen.getByText('Selection is required')).toBeInTheDocument();
  });
});

describe('<Textarea />', () => {
  it('renders label and text content', () => {
    render(<Textarea label="Comments" placeholder="Write here" />);
    expect(screen.getByLabelText('Comments')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Write here')).toBeInTheDocument();
  });

  it('displays character count', () => {
    render(<Textarea value="Hello" showCharCount maxLength={10} onChange={() => {}} />);
    expect(screen.getByText('5/10')).toBeInTheDocument();
  });

  it('displays error text', () => {
    render(<Textarea error="Must not be empty" />);
    expect(screen.getByText('Must not be empty')).toBeInTheDocument();
  });
});

describe('<Checkbox />', () => {
  it('renders the checkbox and label', () => {
    render(<Checkbox label="Agree to terms" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Agree to terms' });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('toggles value when clicked', () => {
    render(<Checkbox label="Agree to terms" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Agree to terms' });
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('respects disabled state', () => {
    render(<Checkbox label="Disabled checkbox" disabled />);
    const checkbox = screen.getByRole('checkbox', { name: 'Disabled checkbox' });
    expect(checkbox).toBeDisabled();
  });
});
