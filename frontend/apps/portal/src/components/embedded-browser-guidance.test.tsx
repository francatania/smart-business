import { fireEvent, render, screen } from '@testing-library/react';

import { EmbeddedBrowserGuidance, isLikelyEmbeddedBrowser } from './embedded-browser-guidance';

describe('EmbeddedBrowserGuidance', () => {
  it('recognizes common embedded-browser user agents', () => {
    expect(isLikelyEmbeddedBrowser('Mozilla/5.0 Instagram 322.0')).toBe(true);
    expect(isLikelyEmbeddedBrowser('Mozilla/5.0 Chrome/140.0')).toBe(false);
  });

  it('guides the user without claiming a session transfer', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<EmbeddedBrowserGuidance userAgent="Mozilla/5.0 Instagram 322.0" />);

    expect(screen.getByText(/session is not transferred between browsers/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open in browser' }));
    expect(open).toHaveBeenCalledWith(window.location.href, '_blank', 'noopener,noreferrer');
  });

  it('does not render for a regular browser', () => {
    const { container } = render(<EmbeddedBrowserGuidance userAgent="Mozilla/5.0 Chrome/140.0" />);

    expect(container).toBeEmptyDOMElement();
  });
});
