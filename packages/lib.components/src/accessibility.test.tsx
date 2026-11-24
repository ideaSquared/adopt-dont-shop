import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { configureAxe, type AxeMatchers } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import { describe, expect, it, vi } from 'vitest';

import {
  Alert,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  ChartFrame,
  CheckboxInput,
  ConfirmDialog,
  DataTable,
  DateRangePicker,
  DrillDownModal,
  DropdownButton,
  DropdownMenu,
  EmptyState,
  EntityInspector,
  ErrorBoundary,
  ErrorState,
  FileUpload,
  FilterPanel,
  Footer,
  FormField,
  Header,
  Input,
  InstallPwaBanner,
  Modal,
  NavSidebar,
  Navbar,
  NotFoundPage,
  PageHeader,
  QueryBoundary,
  ReportBuilder,
  SanctionBanner,
  SearchToolbar,
  SelectInput,
  SkipLink,
  SplitPaneDetail,
  Stepper,
  Tabs,
  TextArea,
  TextInput,
  Toast,
  ToastContainer,
  Toaster,
  Tooltip,
  WidgetPicker,
  toast,
} from './index';

declare module 'vitest' {
  // vitest-axe 0.1.0 ships its matcher types for the legacy `Vi` namespace;
  // this registers them on the current `Assertion` interface instead. The type
  // parameters must keep vitest's names and constraints for the declarations to merge.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<R extends void | Promise<void>, T> extends AxeMatchers {}
}

expect.extend(axeMatchers);

/**
 * Every exported component that renders interactive UI is checked here with
 * axe-core against the WCAG 2.2 AA rule set (the same tags as the Playwright
 * smoke in e2e/tests/a11y). jsdom does no layout, so axe skips the rules that
 * need it (colour contrast, target size); those are covered by the e2e pass
 * and the contrast tests in src/styles.
 */
const WCAG_22_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const axe = configureAxe({ runOnly: { type: 'tag', values: WCAG_22_AA_TAGS } });

// Checks the whole body, so content portalled out of the render container
// (menus, dialogs, tooltips, toasts) is included.
const expectNoViolations = async () => {
  expect(await axe(document.body)).toHaveNoViolations();
};

const noop = () => {};

const withRouter = (ui: React.ReactElement) => <MemoryRouter>{ui}</MemoryRouter>;

type Pet = { petId: string; name: string };
const PETS: ReadonlyArray<Pet> = [
  { petId: 'p1', name: 'Biscuit' },
  { petId: 'p2', name: 'Luna' },
];

const SELECT_OPTIONS = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
];

const STATIC_CASES: ReadonlyArray<[string, () => React.ReactElement]> = [
  ['Button', () => <Button>Save changes</Button>],
  [
    'Card (clickable)',
    () => (
      <Card clickable onClick={noop} aria-label='Open Biscuit'>
        Biscuit
      </Card>
    ),
  ],
  ['Avatar (clickable)', () => <Avatar clickable onClick={noop} name='Sam Example' />],
  [
    'Badge (removable)',
    () => (
      <Badge removable onRemove={noop}>
        Dog
      </Badge>
    ),
  ],
  [
    'ChartFrame (drill-down, with actions)',
    () => (
      <ChartFrame title='Adoptions' onClick={noop} actions={<Button>Export</Button>}>
        <p>Chart</p>
      </ChartFrame>
    ),
  ],
  ['Button (loading)', () => <Button isLoading>Save changes</Button>],
  [
    'Tabs',
    () => (
      <Tabs
        aria-label='Sections'
        value='one'
        onChange={noop}
        tabs={[
          { id: 'one', label: 'One', content: <p>First panel</p> },
          { id: 'two', label: 'Two', content: <p>Second panel</p> },
        ]}
      />
    ),
  ],
  [
    'DropdownButton',
    () => <DropdownButton triggerLabel='Actions' items={[{ label: 'Edit', onClick: noop }]} />,
  ],
  [
    'DropdownMenu',
    () => <DropdownMenu triggerLabel='Menu' items={[{ label: 'Profile', onClick: noop }]} />,
  ],
  [
    'Tooltip',
    () => (
      <Tooltip content='Helpful hint'>
        <button type='button'>Action</button>
      </Tooltip>
    ),
  ],
  ['PageHeader', () => <PageHeader title='Pets' actions={<Button>Add pet</Button>} />],
  [
    'SplitPaneDetail',
    () => (
      <SplitPaneDetail
        items={PETS}
        getItemId={pet => pet.petId}
        selectedId='p1'
        onSelect={noop}
        renderListItem={pet => <span>{pet.name}</span>}
        renderDetail={pet => <p>Detail for {pet.name}</p>}
        listAriaLabel='Pets'
        detailAriaLabel='Pet detail'
      />
    ),
  ],
  [
    'EntityInspector',
    () => (
      <EntityInspector
        header={<h2>Jessica Wilson</h2>}
        onClose={noop}
        tabs={[
          { id: 'overview', label: 'Overview', content: <p>Overview body</p> },
          { id: 'activity', label: 'Activity', content: <p>Activity body</p> },
        ]}
      />
    ),
  ],
  [
    'QueryBoundary (error with retry)',
    () => (
      <QueryBoundary isLoading={false} isError onRetry={noop}>
        <p>content</p>
      </QueryBoundary>
    ),
  ],
  [
    'SearchToolbar',
    () => (
      <SearchToolbar
        searchValue=''
        onSearchChange={noop}
        searchLabel='Search pets'
        filterConfig={[
          { name: 'species', label: 'Species', type: 'select', options: SELECT_OPTIONS },
          { name: 'listedAfter', label: 'Listed after', type: 'date' },
          { name: 'vaccinated', label: 'Vaccinated', type: 'checkbox' },
        ]}
        filters={{}}
        onFilterChange={noop}
        activeFilters={[{ name: 'species', label: 'Species', value: 'Dog' }]}
        onRemoveFilter={noop}
        resultCount={2}
        resultNoun='pets'
      />
    ),
  ],
  ['CheckboxInput', () => <CheckboxInput label='Accept terms' />],
  [
    'CheckboxInput (error)',
    () => <CheckboxInput label='Accept terms' error='You must accept the terms' />,
  ],
  ['SelectInput', () => <SelectInput label='Species' options={SELECT_OPTIONS} />],
  ['TextArea', () => <TextArea label='Description' />],
  ['TextArea (error)', () => <TextArea label='Description' error='Description is required' />],
  ['TextInput', () => <TextInput label='Email address' />],
  ['Input', () => <Input label='Email address' />],
  ['Input (error)', () => <Input label='Email address' error='Enter a valid email' />],
  [
    'FormField',
    () => (
      <FormField label='Name' htmlFor='name' description='Your full name' error='Name is required'>
        <Input id='name' />
      </FormField>
    ),
  ],
  ['DateRangePicker', () => <DateRangePicker value={{ from: null, to: null }} onChange={noop} />],
  ['FileUpload', () => <FileUpload label='Pet photos' />],
  [
    'Alert (closable)',
    () => (
      <Alert title='Saved' closable onClose={noop}>
        Your changes were saved.
      </Alert>
    ),
  ],
  [
    'Breadcrumbs',
    () => (
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Pets', href: '/pets' },
          { label: 'Biscuit', active: true },
        ]}
      />
    ),
  ],
  ['Footer', () => withRouter(<Footer />)],
  ['Header', () => <Header title='Adopt Dont Shop' />],
  [
    'Navbar',
    () => (
      <Navbar
        items={[
          { label: 'Home', href: '/' },
          { label: 'Pets', href: '/pets', active: true },
        ]}
        showUserMenu
        user={{ name: 'Sam Example' }}
        userMenuActions={[{ label: 'Log out', onClick: noop }]}
      />
    ),
  ],
  [
    'NavSidebar',
    () =>
      withRouter(
        <NavSidebar
          collapsible
          onToggleCollapsed={noop}
          groups={[
            {
              id: 'main',
              label: 'Main',
              items: [
                { to: '/', label: 'Dashboard', end: true },
                {
                  to: '/messages',
                  label: 'Messages',
                  badge: 5,
                  badgeAriaLabel: '5 unread messages',
                },
              ],
            },
          ]}
        />
      ),
  ],
  [
    'EmptyState (with action)',
    () => <EmptyState title='No pets yet' actions={[{ label: 'Add a pet', onClick: noop }]} />,
  ],
  [
    'NotFoundPage',
    () =>
      withRouter(
        <NotFoundPage homeLabel='Back to home' suggestions={[{ to: '/pets', label: 'Pets' }]} />
      ),
  ],
  ['ErrorState (with retry)', () => <ErrorState onRetry={noop} />],
  [
    'Stepper (clickable)',
    () => (
      <Stepper
        activeStep={1}
        completedSteps={[0]}
        onStepClick={noop}
        steps={[
          { id: 'about', title: 'About you' },
          { id: 'home', title: 'Your home' },
          { id: 'review', title: 'Review' },
        ]}
      />
    ),
  ],
  [
    'Toast',
    () => (
      <ToastContainer>
        <Toast id='t1' message='Pet saved' type='success' onClose={noop} autoClose={false} />
      </ToastContainer>
    ),
  ],
  [
    'DataTable (sortable, selectable, paginated)',
    () => (
      <DataTable
        title='Pets'
        columns={[
          { key: 'name', label: 'Name', sortable: true },
          { key: 'age', label: 'Age', sortable: true },
        ]}
        rows={[
          { id: 'p1', name: 'Biscuit', age: 4 },
          { id: 'p2', name: 'Luna', age: 2 },
          { id: 'p3', name: 'Mochi', age: 7 },
        ]}
        pageSize={2}
        selectable
        selectedIds={[]}
        onSelectionChange={noop}
        getRowId={row => String(row.id)}
        getRowLabel={row => String(row.name)}
      />
    ),
  ],
  ['FilterPanel (reports)', () => <FilterPanel value={{}} onChange={noop} />],
  ['WidgetPicker', () => <WidgetPicker onAdd={noop} onClose={noop} />],
  [
    'ReportBuilder',
    () => (
      <ReportBuilder
        config={{ filters: {}, layout: { columns: 2 }, widgets: [] }}
        onChange={noop}
        onSave={noop}
      />
    ),
  ],
  ['SkipLink', () => <SkipLink />],
];

describe('component accessibility (axe, WCAG 2.2 AA)', () => {
  it.each(STATIC_CASES)('%s has no axe violations', async (_name, renderUi) => {
    render(renderUi());
    await expectNoViolations();
  });

  it('an open DropdownMenu has no axe violations', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu
        triggerLabel='Menu'
        header={<span>Signed in</span>}
        items={[
          { label: 'Profile', onClick: noop },
          { label: 'Log out', onClick: noop, danger: true, separatorBefore: true },
        ]}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    await expectNoViolations();
  });

  it('an open Tooltip has no axe violations', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content='Helpful hint'>
        <button type='button'>Action</button>
      </Tooltip>
    );
    await user.tab();
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    await expectNoViolations();
  });

  it('an open SelectInput has no axe violations', async () => {
    const user = userEvent.setup();
    render(<SelectInput label='Species' options={SELECT_OPTIONS} />);
    await user.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    await expectNoViolations();
  });

  it('an open Modal has no axe violations', async () => {
    render(
      <Modal isOpen onClose={noop} title='Edit pet' footer={<Button>Save</Button>}>
        <p>Modal content</p>
      </Modal>
    );
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await expectNoViolations();
  });

  it('an open ConfirmDialog has no axe violations', async () => {
    render(
      <ConfirmDialog
        isOpen
        onClose={noop}
        onConfirm={noop}
        title='Delete pet?'
        message='This cannot be undone.'
        variant='danger'
      />
    );
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await expectNoViolations();
  });

  it('a DrillDownModal has no axe violations', async () => {
    render(
      <DrillDownModal title='Adoptions in March' onClose={noop}>
        <p>Breakdown</p>
      </DrillDownModal>
    );
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await expectNoViolations();
  });

  it('an open mobile NavSidebar has no axe violations', async () => {
    render(
      withRouter(
        <NavSidebar
          mobileOpen
          onMobileClose={noop}
          groups={[{ id: 'main', items: [{ to: '/', label: 'Dashboard', end: true }] }]}
        />
      )
    );
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    await expectNoViolations();
  });

  it('the Toaster with a visible toast has no axe violations', async () => {
    render(<Toaster />);
    act(() => {
      toast.success('Pet saved');
    });
    expect(await screen.findByText('Pet saved')).toBeInTheDocument();
    await expectNoViolations();
  });

  it('the ErrorBoundary fallback has no axe violations', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Boom = () => {
      throw new Error('Boom');
    };
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await expectNoViolations();
  });

  it('the InstallPwaBanner install prompt has no axe violations', async () => {
    render(<InstallPwaBanner appName='Adopt Dont Shop' />);
    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), {
          prompt: () => Promise.resolve(),
          userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
        })
      );
    });
    expect(screen.getByTestId('pwa-install-banner')).toBeInTheDocument();
    await expectNoViolations();
  });

  it('a SanctionBanner with an active sanction has no axe violations', async () => {
    render(
      <SanctionBanner
        fetchSanctions={() =>
          Promise.resolve([
            {
              id: 'sanction-1',
              type: 'warning_issued',
              reason: 'Please be kind to other adopters',
              severity: 'low',
              expiresAt: null,
              acknowledgedAt: null,
            },
          ])
        }
        acknowledgeSanction={() => Promise.resolve()}
      />
    );
    await waitFor(() => expect(screen.getByTestId('sanction-banner-item')).toBeInTheDocument());
    await expectNoViolations();
  });
});
