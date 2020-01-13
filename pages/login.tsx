import React, { useState } from "react";
import { useLazyQuery } from "react-apollo";
import { gql } from "apollo-boost";

const useInput = () => {
    const [value, setValue] = useState<string>("");
    const onChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
        const { target: { value: newValue }} = event;
        setValue(newValue);
    }
    return {
        value,
        onChange
    };
}
const LOGIN = gql`
    query Login($name: String!) {
        login(name: $name) {
            ok
            error
            token
        }
    }
`;

export default () => {
    
    const email = useInput();
    const [loginQuery] = useLazyQuery(LOGIN, {
        // fetchPolicy: "network-only",
        onCompleted: data => {
            console.log("Login onCompleted: ", data);
            if(data) {
                const { login: { ok, error }} = data;
                if(ok) {
                    alert("is OK!");
                }
            }
        },
        onError: data => {
            console.log("Login onError: ", data);
        }
    });
    const submit = () => {
        if(email.value === "") {
            alert("Input User name");
            return false;
        }
        loginQuery({
            variables: {
                name: email.value
            }
        });
    }
    return (
        <div>
            <h1>Login Page</h1>

            <input { ...email } type={"text"} />
            <input type={"button"} value={"login"} onClick={submit} />
        </div>
    );
};
