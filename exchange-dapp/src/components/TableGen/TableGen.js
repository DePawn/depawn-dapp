import '../../static/css/BorrowerPage.css';
import '../../static/css/CardFlip.css';

import React, { useState } from 'react';
import { createTable } from '../../external/tablelandInterface';

export default function TableGen() {
    const [isPageLoad, setIsPageLoad] = useState(true);

    const sendCreateTable = async () => {
        /*
         *  Sequence when the page is loaded.
         */

        // Set account and network info
        if (isPageLoad) await createTable('demo_depawn');
        setIsPageLoad(false);
    }

    return (
        <div className="TableGen">
            <div>
                <h1>DePawn</h1>
                <button onClick={sendCreateTable}>Create Table</button>
            </div >
        </div >
    );
}
