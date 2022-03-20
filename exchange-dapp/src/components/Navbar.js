import React from 'react';
import "../static/css/Navbar.css";
import nft_ben from '../static/img/nft_ben.jpg';

export default function Navbar() {
    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
            <img src={nft_ben} className="nav--icon" alt="benny" />
            <h1>DePawn</h1>
            <h4 className="nav--title">React Course - Project 1</h4>
        </nav>
    )
}
