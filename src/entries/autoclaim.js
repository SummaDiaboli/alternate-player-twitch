// @ts-check
'use strict';


setInterval(
	() =>
	{
		const e = document.getElementsByClassName('claimable-bonus__icon');
		if (e.length !== 0)
		{
			const button = /** @type {HTMLElement} */ (/** @type {unknown} */ (e[0]));
			button.click();
		}
	},
	5000
);
