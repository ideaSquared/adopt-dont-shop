export const welcomeEmailTemplate = `
<mjml>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff">
      <mj-column>
        <mj-text font-size="20px" font-weight="bold" color="#333333">
          Welcome to Adopt Don't Shop
        </mj-text>
        <mj-text color="#666666">
          Hi {{firstName}},
        </mj-text>
        <mj-text color="#666666">
          Thank you for joining our community! We're thrilled to have you here.
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#f4f4f4">
      <mj-column>
        <mj-text color="#666666" font-size="14px">
          You can now browse available pets and start your adoption journey.
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#333333">
      <mj-column>
        <mj-text color="#ffffff" align="center" font-size="12px">
          © {{year}} Adopt Don't Shop. All rights reserved.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;
