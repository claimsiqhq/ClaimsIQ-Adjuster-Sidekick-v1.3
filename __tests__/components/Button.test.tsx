// Unit tests for Button Component

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '@/components/ui/Button';

describe('Button Component', () => {
  it('should render with title', () => {
    const { getByText } = render(<Button title="Click Me" onPress={() => {}} />);

    expect(getByText('Click Me')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(<Button title="Click Me" onPress={onPressMock} />);

    fireEvent.press(getByText('Click Me'));

    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('should not call onPress when disabled', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button title="Click Me" onPress={onPressMock} disabled />
    );

    fireEvent.press(getByText('Click Me'));

    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('should show loading indicator when loading', () => {
    const { getByTestId, queryByText } = render(
      <Button title="Click Me" onPress={() => {}} loading />
    );

    // Text should be hidden when loading
    expect(queryByText('Click Me')).toBeNull();

    // Loading indicator should be present
    expect(getByTestId('ActivityIndicator')).toBeTruthy();
  });

  it('should render with icon', () => {
    const { getByTestId } = render(
      <Button title="Save" onPress={() => {}} icon="save-outline" />
    );

    // Icon component should be present
    expect(getByTestId(/Ionicons/)).toBeTruthy();
  });

  describe('variants', () => {
    it('should render primary variant', () => {
      const { getByText } = render(
        <Button title="Primary" onPress={() => {}} variant="primary" />
      );

      expect(getByText('Primary')).toBeTruthy();
    });

    it('should render secondary variant', () => {
      const { getByText } = render(
        <Button title="Secondary" onPress={() => {}} variant="secondary" />
      );

      expect(getByText('Secondary')).toBeTruthy();
    });

    it('should render outline variant', () => {
      const { getByText } = render(
        <Button title="Outline" onPress={() => {}} variant="outline" />
      );

      expect(getByText('Outline')).toBeTruthy();
    });

    it('should render danger variant', () => {
      const { getByText } = render(
        <Button title="Delete" onPress={() => {}} variant="danger" />
      );

      expect(getByText('Delete')).toBeTruthy();
    });
  });

  describe('sizes', () => {
    it('should render small size', () => {
      const { getByText } = render(
        <Button title="Small" onPress={() => {}} size="small" />
      );

      expect(getByText('Small')).toBeTruthy();
    });

    it('should render medium size', () => {
      const { getByText } = render(
        <Button title="Medium" onPress={() => {}} size="medium" />
      );

      expect(getByText('Medium')).toBeTruthy();
    });

    it('should render large size', () => {
      const { getByText } = render(
        <Button title="Large" onPress={() => {}} size="large" />
      );

      expect(getByText('Large')).toBeTruthy();
    });
  });

  it('should render full width when specified', () => {
    const { getByText } = render(
      <Button title="Full Width" onPress={() => {}} fullWidth />
    );

    const button = getByText('Full Width').parent;
    expect(button?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: '100%' })])
    );
  });
});
